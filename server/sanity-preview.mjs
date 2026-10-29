import { spawn } from 'node:child_process'
import path from 'node:path'
import { createImageUrlBuilder } from '@sanity/image-url'

export const SANITY_DRAFT_PREVIEW_PATH = '/api/preview/sanity-drafts'

export const EXPECTED_DRAFT_PREVIEW = Object.freeze({
  categories: 4,
  menuItems: 60,
  specials: 1,
  realSpecialReferences: 4,
  temporarySpecialEntries: 6,
  imageAssets: 15,
})

const imageProjection = `image{asset{_ref},alt,objectPosition,hotspot,crop,"width":asset->metadata.dimensions.width,"height":asset->metadata.dimensions.height}`
const menuItemProjection = `id,name,price,"categoryId":category->id,section,description,${imageProjection},needsConfirmation,isSoldOut,badge,order,_updatedAt,_originalId`

export const DRAFT_PREVIEW_QUERY = `{
  "categories": *[_type == "menuCategory"] | order(order asc){id,"label":name,short,blurb,order,_updatedAt,_originalId},
  "items": *[_type == "menuItem"] | order(order asc){${menuItemProjection}},
  "special": *[_type == "special" && _id == "special-signature-specials"][0]{
    eyebrow,title,_updatedAt,_originalId,
    items[]{
      id,order,
      "menuItem":menuItem->{${menuItemProjection}},
      "temporaryContent":temporaryContent{name,price,"categoryId":category->id,section,description,${imageProjection}}
    }
  }
}`

function requiredCount(name, actual, expected) {
  if (actual !== expected) throw new Error(`Draft preview expected ${expected} ${name}; received ${actual}.`)
}

function isDraft(document) {
  return typeof document?._originalId === 'string' && document._originalId.startsWith('drafts.')
}

function countDocumentStates(documents) {
  return {
    drafts: documents.filter(isDraft).length,
    published: documents.filter((document) => !isDraft(document)).length,
  }
}

function mapImage(image, builder) {
  const assetId = image?.asset?._ref
  if (!assetId) return undefined
  return {
    src: builder.image({ ...image, _type: 'image' }).auto('format').fit('max').url(),
    alt: image.alt || '',
    width: image.width || 900,
    height: image.height || 900,
    ...(image.objectPosition ? { focus: image.objectPosition } : {}),
  }
}

function mapItem(item, builder, label) {
  if (!item?.id || !item.name || !Number.isInteger(item.price) || !item.categoryId || !item.section) {
    throw new Error(`Draft preview has incomplete content or an unresolved weak category reference for ${label || item?.id || 'an item'}.`)
  }
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.categoryId,
    section: item.section,
    ...(item.description ? { description: item.description } : {}),
    ...(item.image?.asset?._ref ? { image: mapImage(item.image, builder) } : {}),
    ...(item.needsConfirmation ? { needsConfirmation: item.needsConfirmation } : {}),
    isSoldOut: Boolean(item.isSoldOut),
    ...(item.badge ? { badge: item.badge } : {}),
  }
}

function revisionOf(documents) {
  return documents.reduce((latest, document) => Math.max(latest, Date.parse(document?._updatedAt || '') || 0), 0)
}

function assertDraftOnly(states, label, expected) {
  requiredCount(`${label} drafts`, states.drafts, expected)
  requiredCount(`${label} published documents`, states.published, 0)
}

export async function createDraftPreviewPayload(client, {
  expected = EXPECTED_DRAFT_PREVIEW,
  imageUrlBuilderFactory = createImageUrlBuilder,
} = {}) {
  const source = await client.fetch(DRAFT_PREVIEW_QUERY)
  const categoriesSource = source?.categories || []
  const itemsSource = source?.items || []
  const specialSource = source?.special
  const categoryStates = countDocumentStates(categoriesSource)
  const itemStates = countDocumentStates(itemsSource)
  const specialStates = countDocumentStates(specialSource ? [specialSource] : [])

  assertDraftOnly(categoryStates, 'category', expected.categories)
  assertDraftOnly(itemStates, 'menu-item', expected.menuItems)
  assertDraftOnly(specialStates, 'special', expected.specials)

  const categories = categoriesSource.map((category) => {
    if (!category.id || !category.label || !category.short || !category.blurb) {
      throw new Error(`Draft preview has incomplete category content for ${category.id || 'an unknown category'}.`)
    }
    return { id: category.id, label: category.label, short: category.short, blurb: category.blurb }
  })
  const categoryIds = new Set(categories.map(({ id }) => id))
  const builder = imageUrlBuilderFactory(client)
  const items = itemsSource.map((item) => mapItem(item, builder, `menu item ${item.id || '(missing ID)'}`))
  for (const item of items) {
    if (!categoryIds.has(item.category)) throw new Error(`Draft preview menu item ${item.id} points to unresolved category ${item.category}.`)
  }

  if (!specialSource?.eyebrow || !specialSource?.title || !Array.isArray(specialSource.items)) {
    throw new Error('Draft preview is missing the Signature Specials content.')
  }
  const specialEntries = [...specialSource.items].sort((a, b) => a.order - b.order).map((entry) => {
    const hasReference = Boolean(entry.menuItem)
    const hasTemporary = Boolean(entry.temporaryContent)
    if (hasReference === hasTemporary) {
      throw new Error(`Draft preview special ${entry.id || '(missing key)'} has a missing or ambiguous item reference.`)
    }
    const sourceItem = hasReference ? entry.menuItem : { ...entry.temporaryContent, id: entry.id, isSoldOut: false }
    const item = mapItem(sourceItem, builder, `special ${entry.id || '(missing key)'}`)
    if (hasReference && item.id !== entry.id) throw new Error(`Draft preview special ${entry.id} resolves to a different menu item.`)
    if (!categoryIds.has(item.category)) throw new Error(`Draft preview special ${entry.id} points to unresolved category ${item.category}.`)
    return { id: entry.id, order: entry.order, kind: hasReference ? 'reference' : 'temporary', item }
  })
  const referenceCount = specialEntries.filter((entry) => entry.kind === 'reference').length
  const temporaryCount = specialEntries.filter((entry) => entry.kind === 'temporary').length
  requiredCount('Signature Specials references', referenceCount, expected.realSpecialReferences)
  requiredCount('temporary Signature Specials entries', temporaryCount, expected.temporarySpecialEntries)

  const assetIds = [...new Set([
    ...itemsSource.map((item) => item.image?.asset?._ref),
    ...specialSource.items.map((entry) => entry.temporaryContent?.image?.asset?._ref),
  ].filter(Boolean))]
  requiredCount('unique referenced Sanity image assets', assetIds.length, expected.imageAssets)
  const assetDocuments = await client.fetch('*[_type == "sanity.imageAsset" && _id in $assetIds]{_id}', { assetIds })
  const foundAssetIds = new Set((assetDocuments || []).map(({ _id }) => _id))
  const missingAssets = assetIds.filter((id) => !foundAssetIds.has(id))
  if (missingAssets.length) throw new Error(`Draft preview is missing ${missingAssets.length} referenced Sanity image asset${missingAssets.length === 1 ? '' : 's'}.`)

  const documentCounts = { menuCategory: categoryStates, menuItem: itemStates, special: specialStates }
  const summary = {
    categoryCount: categories.length,
    menuItemCount: items.length,
    realSpecialReferences: referenceCount,
    temporarySpecialEntries: temporaryCount,
    imageAssetCount: assetIds.length,
    documentCounts,
    publishedDocumentCount: categoryStates.published + itemStates.published + specialStates.published,
  }

  return {
    menu: {
      schemaVersion: 1,
      revision: revisionOf([...categoriesSource, ...itemsSource, specialSource]),
      categories,
      items,
    },
    specials: {
      eyebrow: specialSource.eyebrow,
      title: specialSource.title,
      items: specialEntries.map(({ item }) => item),
      entries: specialEntries,
    },
    summary,
  }
}

function isLoopbackHost(hostHeader = '') {
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.replace(/^\[|\]$/g, '').toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

function isLoopbackAddress(address = '') {
  return address === '::1' || address === '127.0.0.1' || address === '::ffff:127.0.0.1'
}

function isSameOrigin(req) {
  if (String(req.headers['sec-fetch-site'] || '').toLowerCase() === 'cross-site') return false
  const origin = req.headers.origin
  if (!origin) return true
  try {
    const parsed = new URL(origin)
    return ['http:', 'https:'].includes(parsed.protocol)
      && isLoopbackHost(parsed.host)
      && parsed.host.toLowerCase() === String(req.headers.host || '').toLowerCase()
  } catch {
    return false
  }
}

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    Vary: 'Origin',
  })
  res.end(JSON.stringify(payload))
}

function runPreviewCli(root) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const studioRoot = path.join(root, 'studio')
    const args = ['--silent', 'run', 'preview:drafts']
    const child = spawn(command, args, {
      cwd: studioRoot,
      env: process.env,
      shell: process.platform === 'win32',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    let output = ''
    let settled = false
    const timeout = setTimeout(() => {
      child.kill()
      if (!settled) {
        settled = true
        reject(new Error('preview process timed out'))
      }
    }, 30_000)
    timeout.unref?.()

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      output += chunk
      if (output.length > 1_500_000) child.kill()
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      if (!settled) { settled = true; reject(error) }
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (settled) return
      settled = true
      if (code !== 0) { reject(new Error('Sanity CLI preview command failed')); return }
      const marker = 'CAFEIN_DRAFT_PREVIEW_JSON:'
      const payloadStart = output.lastIndexOf(marker)
      if (payloadStart < 0) { reject(new Error('Sanity CLI preview returned invalid data')); return }
      try { resolve(JSON.parse(output.slice(payloadStart + marker.length).trim())) } catch { reject(new Error('Sanity CLI preview returned invalid data')) }
    })
  })
}

export function createSanityDraftPreviewHandler({
  runPreview = () => runPreviewCli(process.cwd()),
  cacheMs = 5_000,
  now = () => Date.now(),
} = {}) {
  let cachedPayload
  let cachedUntil = 0
  let pendingRequest

  return (req, res, next) => {
    let pathname
    try { pathname = new URL(req.url || '/', 'http://localhost').pathname } catch { pathname = '' }
    if (pathname !== SANITY_DRAFT_PREVIEW_PATH) { next?.(); return }

    const localRequest = isLoopbackHost(req.headers.host) && isLoopbackAddress(req.socket?.remoteAddress)
    if (!localRequest || !isSameOrigin(req)) { send(res, 403, { error: 'Draft preview is available only from this computer.' }); return }
    if (req.method !== 'GET') {
      res.setHeader?.('Allow', 'GET')
      send(res, 405, { error: 'Draft preview accepts read-only GET requests.' })
      return
    }

    const respond = async () => {
      if (cachedPayload && now() < cachedUntil) return cachedPayload
      if (!pendingRequest) {
        pendingRequest = Promise.resolve().then(runPreview).then((payload) => {
          cachedPayload = payload
          cachedUntil = now() + cacheMs
          return payload
        }).finally(() => { pendingRequest = undefined })
      }
      return pendingRequest
    }
    void respond().then((payload) => send(res, 200, payload)).catch(() => {
      send(res, 503, { error: 'Sanity draft preview is unavailable. Check Studio CLI login and dataset read access; the website will use its existing menu fallback.' })
    })
  }
}
