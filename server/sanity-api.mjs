import { createHmac, randomBytes, timingSafeEqual, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { createClient } from '@sanity/client'
import defaultImageUrlBuilder from '@sanity/image-url'
import { createHash } from 'node:crypto'
import { MenuStoreError } from './menu-store.mjs'

const scrypt = promisify(scryptCallback)
const COOKIE = 'cafein_admin_session'
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SCRYPT_OPTIONS = { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }
const itemQuery = '*[_type == "menuItem"] | order(order asc){_id,_rev,_updatedAt,id,name,price,"categoryId":category->id,section,description,"image":image{asset,alt,objectPosition,"width":asset->metadata.dimensions.width,"height":asset->metadata.dimensions.height},needsConfirmation,isSoldOut,badge,order}'
const categoryQuery = '*[_type == "menuCategory"] | order(order asc){_id,_rev,_updatedAt,id,"label":name,short,blurb,order}'

function inspectSanityImage(buffer, contentType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) throw new MenuStoreError('The uploaded image data is invalid.', 400, 'invalid_image')
  if (buffer.length > 4 * 1024 * 1024) throw new MenuStoreError('Choose an image smaller than 4 MB for serverless upload.', 413, 'payload_too_large')
  if (contentType === 'image/png') {
    if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || buffer.toString('ascii', 12, 16) !== 'IHDR' || buffer.toString('ascii', buffer.length - 8, buffer.length - 4) !== 'IEND') throw new MenuStoreError('The file is not a complete PNG image.', 415, 'invalid_image')
    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)
    if (!width || !height || width > 10000 || height > 10000 || width * height > 40_000_000) throw new MenuStoreError('Image dimensions are invalid or too large.', 413, 'image_dimensions_too_large')
    return { width, height, extension: 'png' }
  }
  if (contentType === 'image/jpeg') {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[buffer.length - 2] !== 0xff || buffer[buffer.length - 1] !== 0xd9) throw new MenuStoreError('The file is not a complete JPEG image.', 415, 'invalid_image')
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue }
      const marker = buffer[offset + 1]
      if ([0xd8, 0xd9, 0x01].includes(marker) || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue }
      const segmentLength = buffer.readUInt16BE(offset + 2)
      if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) break
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        const height = buffer.readUInt16BE(offset + 5)
        const width = buffer.readUInt16BE(offset + 7)
        if (!width || !height || width > 10000 || height > 10000 || width * height > 40_000_000) throw new MenuStoreError('Image dimensions are invalid or too large.', 413, 'image_dimensions_too_large')
        return { width, height, extension: 'jpg' }
      }
      offset += 2 + segmentLength
    }
  }
  throw new MenuStoreError('Use a complete JPEG or PNG image.', 415, 'unsupported_media_type')
}

function constantEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && timingSafeEqual(left, right)
}

function cookieValue(req) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === COOKIE) { try { return decodeURIComponent(value.join('=')) } catch { return '' } }
  }
  return ''
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function parseSession(req, env, now) {
  const [payload, signature, extra] = cookieValue(req).split('.')
  if (!payload || !signature || extra || !env.ADMIN_SESSION_SECRET || !constantEqual(signature, sign(payload, env.ADMIN_SESSION_SECRET))) return null
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (session.role !== 'manager' || !Number.isFinite(session.createdAt) || !Number.isFinite(session.expiresAt) || !session.csrf) return null
    if (session.expiresAt <= now || session.expiresAt > session.createdAt + 30 * 60_000) return null
    return session
  } catch { return null }
}

function sessionCookie(session, env, maxAge = 1800) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const value = payload + '.' + sign(payload, env.ADMIN_SESSION_SECRET)
  const secure = env.NODE_ENV === 'production' || env.COOKIE_SECURE === 'true' ? '; Secure' : ''
  return COOKIE + '=' + encodeURIComponent(value) + '; Path=/api; HttpOnly; SameSite=Strict; Max-Age=' + maxAge + secure
}

function originAllowed(req, env) {
  if (!req.headers.origin) return false
  if (env.NODE_ENV === 'production' && !env.PUBLIC_ORIGIN) return false
  try {
    const origin = new URL(req.headers.origin)
    const expected = env.PUBLIC_ORIGIN ? new URL(env.PUBLIC_ORIGIN) : new URL((req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host)
    return origin.origin === expected.origin
  } catch { return false }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers })
  res.end(JSON.stringify(body))
}

async function readJson(req, maxBytes = 1024 * 1024) {
  let body = req.body
  if (body === undefined) {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > maxBytes) throw new MenuStoreError('Request body is too large.', 413, 'payload_too_large')
      chunks.push(chunk)
    }
    body = Buffer.concat(chunks)
  }
  if (Buffer.isBuffer(body)) body = body.toString('utf8')
  if (typeof body === 'object' && body !== null) return body
  try { return JSON.parse(String(body || '')) } catch { throw new MenuStoreError('Request body is not valid JSON.') }
}

async function readBinary(req, maxBytes) {
  if (Buffer.isBuffer(req.body)) return req.body
  const declared = Number(req.headers['content-length'] || 0)
  if (declared > maxBytes) throw new MenuStoreError('Choose an image smaller than 4 MB for serverless upload.', 413, 'payload_too_large')
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new MenuStoreError('Choose an image smaller than 4 MB for serverless upload.', 413, 'payload_too_large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function mapImage(image, builder) {
  if (!image || !image.asset || !image.asset._ref) return undefined
  return {
    src: builder.image(image).auto('format').fit('max').url(),
    assetId: image.asset._ref,
    alt: image.alt || '',
    width: image.width || 900,
    height: image.height || 900,
    ...(image.objectPosition ? { focus: image.objectPosition } : {}),
  }
}

function mapItem(item, builder) {
  if (!item || typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' || !Number.isInteger(item.price) || typeof item.section !== 'string' || typeof item.isSoldOut !== 'boolean') throw new MenuStoreError('Sanity contains invalid menu item data.', 503, 'sanity_invalid_content')
  const image = mapImage(item.image, builder)
  return {
    id: item.id, name: item.name, price: item.price, category: item.categoryId, section: item.section,
    ...(item.description ? { description: item.description } : {}),
    ...(image ? { image } : {}),
    ...(item.needsConfirmation ? { needsConfirmation: item.needsConfirmation } : {}),
    isSoldOut: Boolean(item.isSoldOut), ...(item.badge ? { badge: item.badge } : {}), ...(Number.isInteger(item.order) ? { order: item.order } : {}),
  }
}

function revisionOf(documents) {
  if (documents.length && documents.every((doc) => doc._rev)) {
    const digest = createHash('sha256').update(documents.map((doc) => doc._rev).sort().join('|')).digest('hex').slice(0, 13)
    return Number.parseInt(digest, 16)
  }
  return documents.reduce((revision, doc) => Math.max(revision, Date.parse(doc._updatedAt || '') || 0), 0)
}

function applyItemPatch(patch, document) {
  const { _id, _type, ...fields } = document
  let update = patch.set(fields)
  const optionalFields = ['image', 'description', 'needsConfirmation', 'badge', 'order']
  const unset = optionalFields.filter((field) => !Object.hasOwn(fields, field))
  if (unset.length) update = update.unset(unset)
  return update
}

function writeItemPatch(client, document, revision) {
  return applyItemPatch(client.patch(document._id).ifRevisionId(revision), document).commit()
}

function queueItemPatch(transaction, document, revision) {
  transaction.patch(document._id, (patch) => applyItemPatch(patch.ifRevisionId(revision), document))
  return transaction
}

function documentFromItem(item) {
  const { id, category, image, ...fields } = item
  return {
    _id: 'drafts.menuItem-' + id, _type: 'menuItem', ...fields, id,
    category: { _type: 'reference', _ref: 'menuCategory-' + category, _weak: true, _strengthenOnPublish: { type: 'menuCategory' } },
    ...(image ? { image: { _type: 'image', asset: { _type: 'reference', _ref: image.assetId }, alt: image.alt, ...(image.focus ? { objectPosition: image.focus } : {}) } } : {}),
  }
}

function validateCmsItems(items, categories, currentItems = []) {
  if (!Array.isArray(items) || items.length > 500) throw new MenuStoreError('Menu items must be an array of at most 500 entries.')
  const categoryIds = new Set(categories.map((entry) => entry.id))
  const currentById = new Map(currentItems.map((entry) => [entry.id, entry]))
  const seen = new Set()
  return items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new MenuStoreError('Each menu entry must be an object.')
    if (Object.keys(item).some((key) => !['id', 'name', 'price', 'category', 'section', 'description', 'image', 'needsConfirmation', 'isSoldOut', 'badge', 'order'].includes(key))) throw new MenuStoreError('Menu item contains unsupported fields.')
    if (!ID.test(item.id || '') || seen.has(item.id)) throw new MenuStoreError('Each item needs a unique lowercase, hyphenated ID.')
    seen.add(item.id)
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80) throw new MenuStoreError('Menu item name is invalid.')
    if (!Number.isInteger(item.price) || item.price < 0 || item.price > 100000) throw new MenuStoreError('Menu item price is invalid.')
    if (!categoryIds.has(item.category)) throw new MenuStoreError('Menu item category is invalid.')
    if (typeof item.section !== 'string' || !item.section.trim() || item.section.length > 80) throw new MenuStoreError('Menu item section is invalid.')
    if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > 500)) throw new MenuStoreError('Menu item description is invalid.')
    if (item.needsConfirmation !== undefined && (typeof item.needsConfirmation !== 'string' || item.needsConfirmation.length > 250)) throw new MenuStoreError('Menu item confirmation note is invalid.')
    if (typeof item.isSoldOut !== 'boolean') throw new MenuStoreError('Menu item availability is invalid.')
    if (item.badge !== undefined && !['Bestseller', 'Chef Special'].includes(item.badge)) throw new MenuStoreError('Menu item badge is invalid.')
    if (item.order !== undefined && (!Number.isInteger(item.order) || item.order < 0)) throw new MenuStoreError('Menu item ordering is invalid.')
    if (item.image !== undefined) {
      const image = item.image
      const currentImage = currentById.get(item.id)?.image
      const localImage = typeof image.src === 'string' && /^\/images\/[a-zA-Z0-9._/-]+\.(?:webp|jpe?g|png|avif)$/i.test(image.src) && !image.src.includes('..')
      if (Object.keys(image).some((key) => !['src', 'assetId', 'alt', 'width', 'height', 'focus'].includes(key)) || typeof image.alt !== 'string' || !Number.isInteger(image.width) || !Number.isInteger(image.height) || (image.assetId && !/^image-[a-f0-9]+-\d+x\d+-(?:jpg|png|webp|gif|svg)$/i.test(image.assetId)) || (!image.assetId && (!localImage || image.src !== currentImage?.src || !currentImage.assetId))) throw new MenuStoreError('Menu image must reference an existing Sanity asset.')
    }
    return {
      id: item.id,
      name: item.name.trim(),
      price: item.price,
      category: item.category,
      section: item.section.trim(),
      ...(item.description === undefined ? {} : { description: item.description.trim() }),
      ...(item.image === undefined ? {} : { image: item.image }),
      ...(item.needsConfirmation === undefined ? {} : { needsConfirmation: item.needsConfirmation }),
      isSoldOut: item.isSoldOut,
      ...(item.badge ? { badge: item.badge } : {}),
      ...(item.order === undefined ? {} : { order: item.order }),
    }
  })
}

function validateCmsBackup(payload, categories, currentItems) {
  if (!payload || payload.schemaVersion !== 1 || !Number.isInteger(payload.revision) || payload.revision < 0 || Object.keys(payload).some((key) => !['schemaVersion', 'revision', 'categories', 'items'].includes(key))) throw new MenuStoreError('Unsupported menu backup.')
  if (!Array.isArray(payload.categories) || payload.categories.length !== categories.length || categories.some((category) => !payload.categories.some((entry) => entry.id === category.id && entry.label === category.label && entry.short === category.short && entry.blurb === category.blurb))) throw new MenuStoreError('This backup has an incompatible category list.')
  const old = new Map(currentItems.map((item) => [item.id, item]))
  const items = validateCmsItems(payload.items, categories, currentItems)
  return items.map((item) => !Object.hasOwn(item, 'image') && old.get(item.id)?.image ? { ...item, image: old.get(item.id).image } : item)
}

function createReadClient(env) {
  return createClient({ projectId: env.SANITY_PROJECT_ID || 'kgt3bhzl', dataset: env.SANITY_DATASET || 'production', apiVersion: '2025-02-19', perspective: 'published', useCdn: true })
}

export function createWriteClient(env = process.env) {
  if (!env.SANITY_API_TOKEN) return null
  return createClient({ projectId: env.SANITY_PROJECT_ID || 'kgt3bhzl', dataset: env.SANITY_DATASET || 'production', apiVersion: '2025-02-19', token: env.SANITY_API_TOKEN, perspective: 'drafts', useCdn: false })
}

export function createSanityApiHandler({ env = process.env, client = createReadClient(env), writeClient = createSanityWriteClient(env), imageUrlBuilder = defaultImageUrlBuilder, seed, clock = () => Date.now(), imageInspector = inspectSanityImage }) {
  const builderFactory = imageUrlBuilder
  const builder = builderFactory(client)
  const attempts = new Map()

  async function snapshot(perspective) {
      const source = perspective === 'drafts' ? (writeClient || client).withConfig({ perspective: 'drafts', useCdn: false }) : client
    const [rawCategories, rawItems] = await Promise.all([source.fetch(categoryQuery), source.fetch(itemQuery)])
    const categories = rawCategories.map(({ id, label, short, blurb }) => ({ id, label, short, blurb }))
    if (categories.some((category) => !ID.test(category.id || '') || typeof category.label !== 'string' || !category.label || typeof category.short !== 'string' || typeof category.blurb !== 'string')) throw new MenuStoreError('Sanity contains invalid menu category data.', 503, 'sanity_invalid_content')
    const items = rawItems.map((item) => mapItem(item, builder))
    if (!categories.length && !items.length) return null
    if (!categories.length || !items.length) throw new MenuStoreError('Sanity menu is incomplete.', 503, 'sanity_incomplete')
    const ids = new Set(categories.map((category) => category.id))
    const dangling = items.find((item) => !ids.has(item.category))
    if (dangling) throw new MenuStoreError('A published menu item references a missing category.', 503, 'sanity_invalid_reference')
    return { schemaVersion: 1, revision: revisionOf([...rawCategories, ...rawItems]), categories, items: validateCmsItems(items, categories) }
  }

  async function handle(req, res) {
    const path = new URL(req.url || '/', 'https://cafein.invalid').pathname.replace(/\/+$/, '') || '/'
    const method = req.method || 'GET'
    if (!path.startsWith('/api/')) return false
    try {
      if (path === '/api/preview/sanity-drafts') throw new MenuStoreError('Not found.', 404, 'not_found')
      if (path === '/api/menu' && method === 'GET') {
        try {
          const current = await snapshot('published')
          const publicMenu = current ? { ...current, items: current.items.filter((item) => item.id !== 'example') } : null
          if (publicMenu && seed) {
            const categoryIds = new Set(publicMenu.categories.map((category) => category.id))
            const publishedItemIds = new Set(publicMenu.items.map((item) => item.id))
            const incomplete = seed.categories.some((category) => !categoryIds.has(category.id)) || seed.items.some((item) => !publishedItemIds.has(item.id))
            if (incomplete) throw new MenuStoreError('Sanity menu publication is incomplete; serving the tracked menu fallback.', 503, 'sanity_incomplete')
          }
          const menu = publicMenu || seed
          if (!menu) throw new Error('No published Sanity menu or fallback')
          send(res, 200, { items: menu.items, categories: menu.categories, revision: current?.revision || 1 })
        } catch {
          if (!seed) throw new MenuStoreError('The menu is temporarily unavailable.', 503, 'menu_unavailable')
          send(res, 200, { items: seed.items, categories: seed.categories, revision: 1, source: 'fallback' })
        }
        return true
      }
      if (path === '/api/admin/session' && method === 'GET') {
        const session = parseSession(req, env, clock())
        send(res, 200, session ? { authenticated: true, csrfToken: session.csrf } : { authenticated: false })
        return true
      }
      if (path === '/api/admin/login' && method === 'POST') {
        if (!originAllowed(req, env)) throw new MenuStoreError('Request origin is not allowed.', 403, 'origin_invalid')
        if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32 || !writeClient) throw new MenuStoreError('Manager access is not configured.', 503, 'auth_unconfigured')
        const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',').at(-1).trim()
        const now = clock()
        const previous = attempts.get(ip)
        if (previous && now - previous.startedAt < 15 * 60_000 && previous.count >= 5) throw new MenuStoreError('Too many sign-in attempts. Try again later.', 429, 'rate_limited')
        const body = await readJson(req)
        const password = typeof body.password === 'string' ? body.password : ''
        const [algorithm, salt, expected, extra] = env.ADMIN_PASSWORD_HASH.split('$')
        let valid = false
        if (algorithm === 'scrypt' && extra === undefined && /^[a-f0-9]{32,128}$/i.test(salt || '') && /^[a-f0-9]{128}$/i.test(expected || '') && password.length <= 256) {
          const actual = await scrypt(password, Buffer.from(salt, 'hex'), 64, SCRYPT_OPTIONS)
          valid = timingSafeEqual(actual, Buffer.from(expected, 'hex'))
        }
        if (!valid) {
          const bucket = previous && now - previous.startedAt < 15 * 60_000 ? previous : { startedAt: now, count: 0 }
          bucket.count += 1
          attempts.set(ip, bucket)
          throw new MenuStoreError('Sign-in failed. Check your credentials and try again.', 401, 'invalid_credentials')
        }
        attempts.delete(ip)
        const csrf = randomBytes(32).toString('base64url')
        const session = { role: 'manager', csrf, createdAt: now, expiresAt: now + 30 * 60_000 }
        send(res, 200, { authenticated: true, csrfToken: csrf }, { 'Set-Cookie': sessionCookie(session, env) })
        return true
      }
      if (path.startsWith('/api/admin/')) {
        const session = parseSession(req, env, clock())
        if (!session || !writeClient) throw new MenuStoreError('Authentication required.', 401, 'unauthorized')
        if (method !== 'GET' && (!originAllowed(req, env) || !constantEqual(req.headers['x-csrf-token'] || '', session.csrf))) throw new MenuStoreError('Request origin or CSRF token is invalid.', 403, 'csrf_invalid')
        const headers = {}
        const admin = writeClient
        if (path === '/api/admin/logout' && method === 'POST') {
          send(res, 200, { authenticated: false }, { 'Set-Cookie': COOKIE + '=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0' + (env.NODE_ENV === 'production' ? '; Secure' : '') })
          return true
        }
        if ((path === '/api/admin/menu' || path === '/api/admin/export') && method === 'GET') {
          const current = await snapshot('drafts') || { schemaVersion: 1, revision: 1, categories: seed?.categories || [], items: seed?.items || [] }
          send(res, 200, path.endsWith('/export') ? { schemaVersion: 1, revision: current.revision, categories: current.categories, items: current.items } : current, headers)
          return true
        }
        if (path === '/api/admin/images' && method === 'POST') {
          const type = String(req.headers['content-type'] || '').split(';')[0].toLowerCase()
          const bytes = await readBinary(req, 4 * 1024 * 1024)
          const info = imageInspector(bytes, type)
          const sha1hash = createHash('sha1').update(bytes).digest('hex')
          const existing = await admin.fetch('*[_type == "sanity.imageAsset" && sha1hash == $sha1hash][0]{_id,url}', { sha1hash })
          const asset = existing || await admin.assets.upload('image', bytes, { filename: 'cafein-menu.' + info.extension, contentType: type })
          send(res, 201, { image: { src: asset.url, assetId: asset._id, alt: 'Cafe In menu photograph', width: info.width, height: info.height } }, headers)
          return true
        }
        if (path === '/api/admin/images' && method === 'DELETE') { send(res, 200, { deleted: false }, headers); return true }
        const itemPath = path.match(/^\/api\/admin\/menu\/([a-z0-9-]+)$/)
        if (itemPath && method === 'DELETE') throw new MenuStoreError('Item deletion is unavailable in the draft-only Vercel manager. Review and remove it in Sanity Studio; no content was changed.', 409, 'delete_requires_studio')
        if ((path === '/api/admin/menu' && method === 'POST') || (itemPath && method === 'PUT')) {
          const before = await snapshot('drafts') || { revision: 1, categories: seed?.categories || [], items: seed?.items || [] }
          const ifMatch = Number(String(req.headers['if-match'] || '').replaceAll('"', ''))
          if (ifMatch !== before.revision) throw new MenuStoreError('The menu changed in another session. Reload and try again.', 409, 'revision_conflict')
          const id = itemPath ? decodeURIComponent(itemPath[1]) : ''
          let savedId = id
          const body = await readJson(req)
          savedId = body.id
          if (!ID.test(body.id || '') || (method === 'PUT' && body.id !== id) || !before.categories.some((category) => category.id === body.category)) throw new MenuStoreError('Item ID or category is invalid.', 400, 'invalid_item')
          const candidates = method === 'POST' ? [...before.items, body] : before.items.map((item) => item.id === id ? { ...body, id } : item)
          const validated = validateCmsItems(candidates, before.categories, before.items)
          const item = validated.find((entry) => entry.id === body.id)
          const document = documentFromItem(item)
          const draftId = document._id
          const existingDraft = await admin.withConfig({ perspective: 'raw', useCdn: false }).fetch('*[_id == $draftId][0]{_id,_rev}', { draftId })
          if (existingDraft?._rev) await writeItemPatch(admin, document, existingDraft._rev)
          else await admin.create(document)
          const after = await snapshot('drafts') || before
          send(res, method === 'POST' ? 201 : 200, { item: after.items.find((item) => item.id === savedId) || null, revision: after.revision }, headers)
          return true
        }
        if (path === '/api/admin/import/preview' && method === 'POST') {
          const backup = await readJson(req)
          const current = await snapshot('drafts') || { revision: 1, categories: seed?.categories || [], items: seed?.items || [] }
          const imported = validateCmsBackup(backup, current.categories, current.items)
          const next = new Map(imported.items.map((item) => [item.id, item]))
          const currentById = new Map(current.items.map((item) => [item.id, item]))
          send(res, 200, { baseRevision: current.revision, added: imported.items.filter((item) => !currentById.has(item.id)).map((item) => item.id), updated: imported.items.filter((item) => currentById.has(item.id) && JSON.stringify(item) !== JSON.stringify(currentById.get(item.id))).map((item) => item.id), removed: current.items.filter((item) => !next.has(item.id)).map((item) => item.id), itemCount: imported.items.length }, headers)
          return true
        }
        if (path === '/api/admin/import/apply' && method === 'POST') {
          const body = await readJson(req)
          if (body.confirmReplace !== true) throw new MenuStoreError('Confirm the backup before applying it.', 400, 'confirmation_required')
          const current = await snapshot('drafts') || { revision: 1, categories: seed?.categories || [], items: seed?.items || [] }
          if (Number(String(req.headers['if-match'] || '').replaceAll('"', '')) !== current.revision) throw new MenuStoreError('The menu changed in another session.', 409, 'revision_conflict')
          const imported = validateCmsBackup(body.backup, current.categories, current.items)
          const removed = current.items.filter((item) => !imported.some((next) => next.id === item.id))
          if (removed.length) throw new MenuStoreError('This backup removes existing items. Apply those removals individually from the manager after reviewing their live effects; no backup changes were applied.', 409, 'draft_removal_requires_review')
          const existingDrafts = await admin.withConfig({ perspective: 'raw', useCdn: false }).fetch('*[_type == "menuItem" && _id in path("drafts.**")]{_id,_rev,id}')
          const draftById = new Map(existingDrafts.map((draft) => [draft.id, draft]))
          const transaction = admin.transaction()
          for (const item of imported) {
            const document = documentFromItem(item)
            const existingDraft = draftById.get(item.id)
            if (existingDraft?._rev) queueItemPatch(transaction, document, existingDraft._rev)
            else transaction.create(document)
          }
          await transaction.commit()
          const updated = await snapshot('drafts')
          send(res, 200, { revision: updated?.revision || current.revision + 1, itemCount: imported.length, removedAsDrafts: [] }, headers)
          return true
        }
        if (path === '/api/admin/publish' && method === 'POST') {
          const body = await readJson(req)
          if (body.confirm !== true || body.scope !== 'menu') throw new MenuStoreError('Explicitly confirm publishing approved menu content.', 400, 'confirmation_required')
          const source = admin.withConfig({ perspective: 'raw', useCdn: false })
          const [categories, items] = await Promise.all([
            source.fetch('*[_type == "menuCategory" && _id in path("drafts.*")]{_id,id,order}'),
            source.fetch('*[_type == "menuItem" && _id in path("drafts.*")]{_id,id}'),
          ])
          const current = await snapshot('drafts')
          if ((!categories.length && !items.length) || !current || current.items.some((item) => !current.categories.some((category) => category.id === item.category))) throw new MenuStoreError('Resolve all menu references and review drafts before publishing.', 409, 'menu_incomplete')
          for (const category of categories) await admin.action({ actionType: 'sanity.action.document.publish', publishedId: category._id.replace(/^drafts\./, ''), draftId: category._id })
          const publishable = items.filter((item) => item.id !== 'example')
          for (const item of publishable) await admin.action({ actionType: 'sanity.action.document.publish', publishedId: item._id.replace(/^drafts\./, ''), draftId: item._id })
          send(res, 200, { publishedCategories: categories.length, publishedItems: publishable.length, heldForReview: items.filter((item) => item.id === 'example').map((item) => item.id) }, headers)
          return true
        }
        throw new MenuStoreError('API endpoint was not found.', 404, 'not_found')
      }
      throw new MenuStoreError('API endpoint was not found.', 404, 'not_found')
    } catch (error) {
      const status = error instanceof MenuStoreError ? error.status : 500
      send(res, status, { error: error instanceof MenuStoreError ? error.message : 'The request could not be completed.', code: error instanceof MenuStoreError ? error.code : 'internal_error' })
      return true
    }
  }
  return (req, res) => handle(req, res)
}

export function createSanityWriteClient(env = process.env) {
  if (!env.SANITY_API_TOKEN) return null
  return createClient({ projectId: env.SANITY_PROJECT_ID || 'kgt3bhzl', dataset: env.SANITY_DATASET || 'production', apiVersion: '2025-02-19', token: env.SANITY_API_TOKEN, perspective: 'drafts', useCdn: false })
}
