import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@sanity/client'
import { loadSourceData, assertSourceData, loadVerifiedBackupData } from './source-data.mjs'
import { unpublishedReference } from './migration-reference-strategy.mjs'
import { missingDraftDocuments, planImageAssets } from './migration-resume.mjs'

const projectId = 'kgt3bhzl'
const dataset = 'production'
const apiVersion = '2026-10-29'
const applyDrafts = process.argv.includes('--apply-drafts')
const authenticatedPreflight = process.argv.includes('--authenticated-preflight')
const liveData = await loadSourceData()
assertSourceData(liveData)
const data = await loadVerifiedBackupData(liveData)

function mediaFor(item) {
  return item.image ? { ...item.image, sourcePath: item.image.src } : undefined
}

const imageMap = new Map()
for (const item of data.store.items) {
  const media = mediaFor(item)
  if (media) imageMap.set(media.sourcePath, media)
}
for (const item of data.specialItems.filter((entry) => entry.id.startsWith('temp-'))) {
  const media = mediaFor(item)
  if (media) imageMap.set(media.sourcePath, media)
}

const images = []
for (const [sourcePath, metadata] of imageMap) {
  const absolutePath = path.resolve(data.root, 'public', sourcePath.replace(/^\/+/, ''))
  try {
    const details = await stat(absolutePath)
    if (!details.isFile()) throw new Error('not a regular file')
    const buffer = await readFile(absolutePath)
    images.push({ sourcePath, absolutePath, metadata, buffer, sha1: createHash('sha1').update(buffer).digest('hex') })
  } catch (error) {
    throw new Error(`Cannot migrate image ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
const imageByPath = new Map(images.map((image) => [image.sourcePath, image]))

const categoryIds = new Map(data.store.categories.map((category, order) => [category.id, `menuCategory-${category.id}`]))
const categoryDocs = data.store.categories.map((category, order) => ({
  _id: `drafts.menuCategory-${category.id}`,
  _type: 'menuCategory',
  id: category.id,
  name: category.label,
  short: category.short,
  blurb: category.blurb,
  order,
}))

function imageField(item) {
  if (!item.image) return undefined
  const source = imageByPath.get(item.image.src)
  if (!source) throw new Error(`Image plan missing for ${item.image.src}`)
  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: source.assetId },
    alt: item.image.alt,
    ...(item.image.focus ? { objectPosition: item.image.focus } : {}),
  }
}

const itemDocs = data.store.items.map((item, order) => ({
  _id: `drafts.menuItem-${item.id}`,
  _type: 'menuItem',
  id: item.id,
  name: item.name,
  price: item.price,
  category: unpublishedReference(categoryIds.get(item.category), 'menuCategory'),
  section: item.section,
  ...(item.description ? { description: item.description } : {}),
  ...(imageField(item) ? { image: imageField(item) } : {}),
  ...(item.needsConfirmation ? { needsConfirmation: item.needsConfirmation } : {}),
  isSoldOut: Boolean(item.isSoldOut),
  ...(item.badge ? { badge: item.badge } : {}),
  order,
}))

const realItems = new Map(data.store.items.map((item) => [item.id, item]))
const specialEntries = [
  ...data.specials.ids.map((id, order) => ({
    _key: id,
    _type: 'specialEntry',
    id,
    order,
    menuItem: unpublishedReference(`menuItem-${id}`, 'menuItem'),
  })),
  ...data.specialItems.filter((item) => item.id.startsWith('temp-')).map((item, index) => ({
    _key: item.id,
    _type: 'specialEntry',
    id: item.id,
    order: data.specials.ids.length + index,
    temporaryContent: {
      name: item.name,
      price: item.price,
      category: unpublishedReference(categoryIds.get(item.category), 'menuCategory'),
      section: item.section,
      ...(item.description ? { description: item.description } : {}),
      ...(imageField(item) ? { image: imageField(item) } : {}),
    },
  })),
]
for (const id of data.specials.ids) if (!realItems.has(id)) throw new Error(`Special item ${id} is missing from the live menu.`)
const specialDoc = {
  _id: 'drafts.special-signature-specials',
  _type: 'special',
  eyebrow: data.specials.eyebrow,
  title: data.specials.title,
  items: specialEntries,
}
const documents = [...categoryDocs, ...itemDocs, specialDoc]

const sanityClient = createClient({ projectId, dataset, apiVersion, useCdn: false })
let writeClient = sanityClient
let preflightClient = sanityClient
if (applyDrafts || authenticatedPreflight) {
  const { getCliClient } = await import('sanity/cli')
  const cliClient = getCliClient({ apiVersion }).withConfig({ projectId, dataset, useCdn: false, perspective: 'raw' })
  preflightClient = cliClient
  if (applyDrafts) writeClient = cliClient
}

let existingById = new Map()
let existingSpecialDocs = []
try {
  const stableIds = [...data.store.categories.map(({ id }) => id), ...data.store.items.map(({ id }) => id)]
  const existing = await preflightClient.fetch(
    '*[_type in $types && id in $ids]{_id,_type,id}',
    { types: ['menuCategory', 'menuItem'], ids: stableIds },
  )
  existingById = new Map()
  for (const document of existing) {
    const key = `${document._type}:${document.id}`
    existingById.set(key, [...(existingById.get(key) || []), document._id])
  }
  existingSpecialDocs = await preflightClient.fetch('*[_type == "special"]{_id}')
} catch (error) {
  if (applyDrafts || authenticatedPreflight) throw new Error(`Could not inspect existing Sanity documents before writing: ${error instanceof Error ? error.message : String(error)}`)
  console.warn(`Existing document inspection unavailable in dry-run: ${error instanceof Error ? error.message : String(error)}`)
}

const conflicts = []
for (const document of documents) {
  const matches = document._type === 'special'
    ? undefined
    : existingById.get(`${document._type}:${document.id}`)
  if (matches?.length) {
    const expectedDraftId = document._id
    const otherIds = matches.filter((id) => id !== expectedDraftId)
    if (otherIds.length) conflicts.push(`${document._type} ${document.id} already exists as ${otherIds.join(', ')}; inspect before migrating.`)
  }
}
for (const existing of existingSpecialDocs) {
  if (existing._id !== specialDoc._id) conflicts.push(`A Signature Specials document already exists as ${existing._id}; review it before migration.`)
}
if (conflicts.length) throw new Error(`Stable-ID conflicts detected; no writes made:\n${conflicts.join('\n')}`)

let existingAssets = []
try {
  existingAssets = await preflightClient.fetch(
    '*[_type == "sanity.imageAsset" && sha1hash in $hashes]{_id,sha1hash}',
    { hashes: images.map(({ sha1 }) => sha1) },
  )
} catch (error) {
  if (applyDrafts || authenticatedPreflight) throw new Error(`Could not inspect existing image assets before writing: ${error instanceof Error ? error.message : String(error)}`)
  console.warn(`Existing image asset inspection unavailable in dry-run: ${error instanceof Error ? error.message : String(error)}`)
}
const imageAssetPlan = planImageAssets(images, existingAssets)
for (const image of imageAssetPlan) {
  if (image.existingAssetId) imageByPath.get(image.sourcePath).assetId = image.existingAssetId
}

const existingDraftIds = new Set([
  ...[...existingById.values()].flat().filter((id) => id.startsWith('drafts.')),
  ...existingSpecialDocs.map(({ _id }) => _id).filter((id) => id.startsWith('drafts.')),
])
const documentsToCreate = missingDraftDocuments(documents, existingDraftIds)

const plan = {
  projectId,
  dataset,
  mode: applyDrafts ? 'create drafts only; never publish' : authenticatedPreflight ? 'authenticated raw-perspective dry-run; no mutations' : 'dry-run; no mutations',
  categories: categoryDocs.length,
  menuItems: itemDocs.length,
  specials: 1,
  referencedSpecialEntries: data.specials.ids.length,
  temporarySpecialEntries: specialEntries.length - data.specials.ids.length,
  uniqueLocalImages: images.length,
  imageFiles: images.map(({ sourcePath, buffer }) => ({ sourcePath, bytes: buffer.byteLength })),
  existingStableIdMatches: existingById.size,
  existingDeterministicDrafts: documents.length - documentsToCreate.length,
  documentsToCreate: documentsToCreate.length,
  imageAssetsToReuse: imageAssetPlan.filter(({ action }) => action !== 'upload').length,
  imageAssetsToUpload: imageAssetPlan.filter(({ action }) => action === 'upload').length,
  duplicateExistingAssetGroups: imageAssetPlan.filter(({ duplicateAssetCount }) => duplicateAssetCount > 0).length,
  sourceBackup: path.relative(data.root, data.backupPath),
  ownerReviewItems: ['example'],
}
console.log(JSON.stringify(plan, null, 2))
if (!applyDrafts) {
  console.log('Dry-run complete. Re-run through Sanity CLI with a logged-in user token and --apply-drafts to create unpublished drafts after review.')
  process.exit(0)
}

const resolvedAssetIds = new Map()
for (const image of imageAssetPlan) {
  if (image.existingAssetId) {
    resolvedAssetIds.set(image.sha1, image.existingAssetId)
    imageByPath.get(image.sourcePath).assetId = image.existingAssetId
  } else if (image.action === 'reuse-planned') {
    const resolved = resolvedAssetIds.get(image.sha1)
    if (!resolved) throw new Error(`Image asset resume plan could not resolve ${image.sourcePath} from the same content hash.`)
    imageByPath.get(image.sourcePath).assetId = resolved
  } else {
    try {
      const uploaded = await writeClient.assets.upload('image', image.buffer, {
        filename: path.basename(image.absolutePath),
        contentType: /\.png$/i.test(image.absolutePath) ? 'image/png' : /\.jpe?g$/i.test(image.absolutePath) ? 'image/jpeg' : 'image/webp',
      })
      resolvedAssetIds.set(image.sha1, uploaded._id)
      imageByPath.get(image.sourcePath).assetId = uploaded._id
    } catch (error) {
      throw new Error(`Image upload failed for ${image.sourcePath}; any earlier uploads can be reused by SHA-1 on rerun. ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

// Assets are assigned now; refresh image fields before constructing the write batch.
const finalItemDocs = data.store.items.map((item, order) => {
  const document = itemDocs[order]
  return item.image ? { ...document, image: imageField(item) } : document
})
const finalSpecialEntries = specialEntries.map((entry) => {
  if (!entry.temporaryContent?.image) return entry
  const item = data.specialItems.find(({ id }) => id === entry.id)
  return { ...entry, temporaryContent: { ...entry.temporaryContent, image: imageField(item) } }
})
const finalSpecialDoc = { ...specialDoc, items: finalSpecialEntries }

const finalDocs = missingDraftDocuments([...categoryDocs, ...finalItemDocs, finalSpecialDoc], existingDraftIds)
for (const document of finalDocs) {
  try {
    await writeClient.createIfNotExists(document)
  } catch (error) {
    throw new Error(`Draft write failed for ${document._type} ${document.id || document._id}; earlier deterministic drafts are preserved and safe to resume. ${error instanceof Error ? error.message : String(error)}`)
  }
}
console.log(`Created missing draft documents. Existing deterministic drafts were preserved. Uploaded/reused ${images.length} unique image assets. Nothing was published.`)
