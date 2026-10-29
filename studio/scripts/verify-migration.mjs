import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getCliClient } from 'sanity/cli'
import { loadSourceData, loadVerifiedBackupData } from './source-data.mjs'

const projectId = 'kgt3bhzl'
const dataset = 'production'
const apiVersion = '2026-10-29'
const { root, store, specials, specialItems } = await loadVerifiedBackupData(await loadSourceData())
const rawClient = getCliClient({ apiVersion }).withConfig({ projectId, dataset, useCdn: false, perspective: 'raw' })
const draftClient = rawClient.withConfig({ perspective: 'drafts' })

const documents = await rawClient.fetch(`*[_type in ["menuCategory", "menuItem", "special"]]{
  _id,_type,id,name,short,blurb,price,section,description,needsConfirmation,isSoldOut,badge,order,eyebrow,title,
  category{_ref,_weak,_strengthenOnPublish{type}},image{asset{_ref},alt,objectPosition},
  items[]{id,order,menuItem{_ref,_weak,_strengthenOnPublish{type}},temporaryContent{name,price,section,description,category{_ref,_weak,_strengthenOnPublish{type}},image{asset{_ref},alt,objectPosition}}}
}`)
const categoryDocs = documents.filter((document) => document._type === 'menuCategory')
const itemDocs = documents.filter((document) => document._type === 'menuItem')
const specialDocs = documents.filter((document) => document._type === 'special')
const countByType = (list) => Object.fromEntries(['menuCategory', 'menuItem', 'special'].map((type) => {
  const typeDocs = list.filter((document) => document._type === type)
  return [type, {
    drafts: typeDocs.filter(({ _id }) => _id.startsWith('drafts.')).length,
    published: typeDocs.filter(({ _id }) => !_id.startsWith('drafts.')).length,
  }]
}))
const specialEntryCounts = (typeDocs) => typeDocs
  .filter((document) => document._type === 'special')
  .reduce((total, document) => ({
    realReferences: total.realReferences + (document.items || []).filter((entry) => entry.menuItem?._ref).length,
    temporaryEntries: total.temporaryEntries + (document.items || []).filter((entry) => entry.temporaryContent).length,
  }), { realReferences: 0, temporaryEntries: 0 })

const draftItems = new Map(itemDocs.filter(({ _id }) => _id.startsWith('drafts.')).map((item) => [item.id, item]))
const draftCategories = new Map(categoryDocs.filter(({ _id }) => _id.startsWith('drafts.')).map((item) => [item.id, item]))
const draftSpecial = specialDocs.find(({ _id }) => _id === 'drafts.special-signature-specials')
const errors = []
for (const [type, entries] of [['menuCategory', categoryDocs], ['menuItem', itemDocs]]) {
  const counts = new Map()
  for (const document of entries) counts.set(document.id, (counts.get(document.id) || 0) + 1)
  for (const [id, count] of counts) if (count > 1) errors.push(`Duplicate ${type} documents for stable ID ${id}: ${count}.`)
}
for (const category of store.categories) {
  const draft = draftCategories.get(category.id)
  if (!draft) errors.push(`Missing category draft: ${category.id}`)
  else if (draft.name !== category.label || draft.short !== category.short || draft.blurb !== category.blurb || draft.order !== store.categories.indexOf(category)) {
    errors.push(`Category content or order mismatch: ${category.id}.`)
  }
}
for (const [order, item] of store.items.entries()) {
  const draft = draftItems.get(item.id)
  if (!draft) errors.push(`Missing menu item draft: ${item.id}`)
  else if (draft.name !== item.name || draft.price !== item.price || draft.section !== item.section
    || (draft.description || undefined) !== (item.description || undefined)
    || (draft.needsConfirmation || undefined) !== (item.needsConfirmation || undefined)
    || Boolean(draft.isSoldOut) !== Boolean(item.isSoldOut)
    || (draft.badge || undefined) !== (item.badge || undefined)
    || draft.order !== order
    || draft.category?._ref !== `menuCategory-${item.category}`
    || draft.category?._weak !== true
    || draft.category?._strengthenOnPublish?.type !== 'menuCategory') {
    errors.push(`Menu item content, category, or order mismatch: ${item.id}.`)
  }
}
if (!draftSpecial) errors.push('Missing Signature Specials draft.')

const normalizeId = (id = '') => id.replace(/^drafts\./, '')
const categoryReferenceErrors = itemDocs.filter(({ _id, category }) => _id.startsWith('drafts.')
  && (!category?._ref || !draftCategories.has(normalizeId(category._ref).replace(/^menuCategory-/, ''))))
for (const item of categoryReferenceErrors) errors.push(`Unresolved menu category reference on ${item.id}.`)

const specialEntries = draftSpecial?.items || []
const realEntries = specialEntries.filter((entry) => entry.menuItem?._ref)
const temporaryEntries = specialEntries.filter((entry) => entry.temporaryContent)
if (realEntries.length !== 4 || temporaryEntries.length !== 6 || specialEntries.length !== 10) {
  errors.push(`Special entries are ${realEntries.length} references and ${temporaryEntries.length} temporary; expected 4 and 6.`)
}
if (draftSpecial && (draftSpecial.eyebrow !== specials.eyebrow || draftSpecial.title !== specials.title)) errors.push('Signature Specials title or eyebrow mismatch.')
for (const [order, id] of specials.ids.entries()) {
  const entry = realEntries.find(({ id: entryId }) => entryId === id)
  if (!entry || entry.order !== order || entry.menuItem?._ref !== `menuItem-${id}`
    || entry.menuItem?._weak !== true || entry.menuItem?._strengthenOnPublish?.type !== 'menuItem') {
    errors.push(`Real special reference/order mismatch: ${id}.`)
  }
}
for (const entry of realEntries) {
  const itemId = normalizeId(entry.menuItem._ref).replace(/^menuItem-/, '')
  if (!draftItems.has(itemId)) errors.push(`Unresolved special menu-item reference: ${entry.id}.`)
}
for (const entry of temporaryEntries) {
  const source = specialItems.find((item) => item.id === entry.id)
  const card = entry.temporaryContent
  if (!source || entry.order !== specials.ids.length + specialItems.filter((item) => item.id.startsWith('temp-')).findIndex((item) => item.id === entry.id)
    || card.name !== source.name || card.price !== source.price || card.section !== source.section
    || (card.description || undefined) !== (source.description || undefined)
    || card.category?._ref !== `menuCategory-${source.category}`
    || card.category?._weak !== true
    || card.category?._strengthenOnPublish?.type !== 'menuCategory') errors.push(`Temporary special content or order mismatch: ${entry.id}.`)
  const categoryId = normalizeId(entry.temporaryContent.category?._ref).replace(/^menuCategory-/, '')
  if (!draftCategories.has(categoryId)) errors.push(`Unresolved temporary-entry category reference: ${entry.id}.`)
}

const expectedImages = new Map()
for (const item of store.items) if (item.image) expectedImages.set(item.image.src, item.image)
for (const item of specialItems.filter((entry) => entry.id.startsWith('temp-'))) if (item.image) expectedImages.set(item.image.src, item.image)
const expectedHashes = new Map()
for (const [sourcePath, metadata] of expectedImages) {
  const buffer = await readFile(path.join(root, 'public', sourcePath.replace(/^\/+/, '')))
  expectedHashes.set(sourcePath, { metadata, sha1: createHash('sha1').update(buffer).digest('hex') })
}
const assets = await rawClient.fetch('*[_type == "sanity.imageAsset"]{_id,sha1hash}')
const assetIdsByHash = new Map()
for (const asset of assets) assetIdsByHash.set(asset.sha1hash, [...(assetIdsByHash.get(asset.sha1hash) || []), asset._id])
for (const [sourcePath, expected] of expectedHashes) {
  if (!(assetIdsByHash.get(expected.sha1) || []).length) errors.push(`Missing Sanity image asset for ${sourcePath}.`)
  if ((assetIdsByHash.get(expected.sha1) || []).length > 1) errors.push(`Duplicate Sanity image assets for ${sourcePath}.`)
}

function verifyImageField(document, expected, label) {
  const image = document?.image
  const expectedAssetId = assetIdsByHash.get(expected.sha1)?.[0]
  if (!image || image.asset?._ref !== expectedAssetId) errors.push(`Image reference missing or incorrect: ${label}.`)
  if (image?.alt !== expected.metadata.alt) errors.push(`Image alt text mismatch: ${label}.`)
  if ((image?.objectPosition || undefined) !== (expected.metadata.focus || undefined)) errors.push(`Image focus metadata mismatch: ${label}.`)
}

for (const item of store.items.filter((entry) => entry.image)) {
  const expected = expectedHashes.get(item.image.src)
  const draft = draftItems.get(item.id)
  if (draft) verifyImageField(draft, expected, `menu item ${item.id}`)
}
for (const entry of temporaryEntries) {
  const source = specialItems.find((item) => item.id === entry.id)
  const expected = source?.image && expectedHashes.get(source.image.src)
  if (expected) verifyImageField(entry.temporaryContent, expected, `temporary special ${entry.id}`)
}

const publishedContentCount = documents.filter(({ _id }) => !_id.startsWith('drafts.')).length
const referenceResolution = await draftClient.fetch(`{
  "items": *[_type == "menuItem" && id in $itemIds]{id,"categoryId":category->id},
  "special": *[_type == "special" && _id == "special-signature-specials"][0]{items[]{id,"menuItemId":menuItem->id,"temporaryCategoryId":temporaryContent.category->id}}
}`, { itemIds: store.items.map(({ id }) => id) })
for (const item of store.items) {
  const resolved = referenceResolution.items.find((entry) => entry.id === item.id)
  if (resolved?.categoryId !== item.category) errors.push(`Sanity category reference does not resolve for ${item.id}.`)
}
for (const id of specials.ids) {
  const resolved = referenceResolution.special?.items?.find((entry) => entry.id === id)
  if (resolved?.menuItemId !== id) errors.push(`Sanity special reference does not resolve for ${id}.`)
}
const report = {
  projectId,
  dataset,
  contentDocuments: countByType(documents),
  specialEntriesByDocumentState: {
    draft: specialEntryCounts(documents.filter(({ _id }) => _id.startsWith('drafts.'))),
    published: specialEntryCounts(documents.filter(({ _id }) => !_id.startsWith('drafts.'))),
  },
  expected: { categories: store.categories.length, menuItems: store.items.length, specialReferences: specials.ids.length, temporarySpecials: specialItems.filter((item) => item.id.startsWith('temp-')).length, uniqueLocalImages: expectedImages.size },
  migrated: { categoryDrafts: draftCategories.size, menuItemDrafts: draftItems.size, specialDraft: Boolean(draftSpecial), uniqueExpectedAssetsFound: [...expectedHashes.values()].filter(({ sha1 }) => (assetIdsByHash.get(sha1) || []).length === 1).length },
  publishedContentDocuments: publishedContentCount,
  referenceResolution: { menuItems: referenceResolution.items.length, specialMenuItems: referenceResolution.special?.items?.filter((entry) => entry.menuItemId).length || 0 },
  imageReferencesChecked: store.items.filter((item) => item.image).length + temporaryEntries.filter((entry) => entry.temporaryContent?.image).length,
  duplicateAssetHashes: [...assetIdsByHash.entries()].filter(([, ids]) => ids.length > 1).length,
  issues: errors,
}
console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exitCode = 1
