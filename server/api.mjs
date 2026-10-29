import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { isDeepStrictEqual, promisify } from 'node:util'
import { createMenuStore, MenuStoreError, validateBackup } from './menu-store.mjs'
import { createR2ImageStore, inspectMenuImage, MAX_MENU_IMAGE_BYTES } from './r2-images.mjs'

const scrypt = promisify(scryptCallback)
const SESSION_COOKIE = 'cafein_admin_session'
const SESSION_IDLE_MS = 30 * 60 * 1000
const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000
const MAX_BODY_BYTES = 1024 * 1024
const SCRYPT_OPTIONS = { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }

function reply(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new MenuStoreError('Request body is too large.', 413, 'payload_too_large'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const contentType = String(req.headers['content-type'] || '').split(';')[0]
        if (contentType !== 'application/json') throw new MenuStoreError('Send a JSON request body.', 415, 'unsupported_media_type')
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (error) {
        reject(error instanceof MenuStoreError ? error : new MenuStoreError('Request body is not valid JSON.'))
      }
    })
    req.on('error', reject)
  })
}

function readImageBody(req) {
  return new Promise((resolve, reject) => {
    const declaredLength = Number(req.headers['content-length'] || 0)
    if (declaredLength > MAX_MENU_IMAGE_BYTES) {
      req.resume()
      reject(new MenuStoreError('Choose an image smaller than 5 MB.', 413, 'payload_too_large'))
      return
    }
    let size = 0
    let settled = false
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_MENU_IMAGE_BYTES) {
        if (!settled) {
          settled = true
          reject(new MenuStoreError('Choose an image smaller than 5 MB.', 413, 'payload_too_large'))
        }
        return
      }
      if (!settled) chunks.push(chunk)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      resolve(Buffer.concat(chunks))
    })
    req.on('error', (error) => {
      if (!settled) reject(error)
    })
  })
}

function cookieValue(req, name) {
  const cookies = String(req.headers.cookie || '').split(';')
  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split('=')
    if (key === name) {
      try { return decodeURIComponent(value.join('=')) } catch { return '' }
    }
  }
  return ''
}

function constantTimeTextEqual(left, right) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function verifyPassword(password, encoded) {
  const [algorithm, saltHex, expectedHex, extra] = String(encoded || '').split('$')
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32,128}$/i.test(saltHex || '') || !/^[a-f0-9]{128}$/i.test(expectedHex || '') || extra !== undefined) return false
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), 64, SCRYPT_OPTIONS)
  return timingSafeEqual(actual, Buffer.from(expectedHex, 'hex'))
}

function normalizeOrigin(req, configuredOrigin, requireConfiguredOrigin = false) {
  const origin = req.headers.origin
  if (typeof origin !== 'string' || (requireConfiguredOrigin && !configuredOrigin)) return false
  try {
    const parsed = new URL(origin)
    const expected = configuredOrigin || `${parsed.protocol}//${req.headers.host}`
    return parsed.origin === new URL(expected).origin
  } catch {
    return false
  }
}

function makeSessionCookie(token, env) {
  const secure = env.NODE_ENV === 'production' || env.COOKIE_SECURE === 'true' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=1800${secure}`
}

export function createApiHandler({ seed, filePath, env = process.env, clock = () => Date.now(), imageStore = createR2ImageStore(env) }) {
  const store = createMenuStore({ filePath, seed, publicImageBase: imageStore.publicBase || '' })
  const sessions = new Map()
  const loginAttempts = new Map()
  let activePasswordChecks = 0
  let mutationChain = Promise.resolve()

  function serializeMutation(operation) {
    const result = mutationChain.then(operation)
    mutationChain = result.catch(() => undefined)
    return result
  }

  function getClientKey(req) {
    return req.socket?.remoteAddress || 'unknown'
  }

  function getSession(req) {
    const token = cookieValue(req, SESSION_COOKIE)
    const session = sessions.get(token)
    const now = clock()
    if (!session || now - session.lastActivity > SESSION_IDLE_MS || now - session.createdAt > SESSION_ABSOLUTE_MS) {
      sessions.delete(token)
      return null
    }
    session.lastActivity = now
    return session
  }

  function requireCsrf(req, session) {
    const header = req.headers['x-csrf-token']
    if (typeof header !== 'string' || !constantTimeTextEqual(header, session.csrfToken)) {
      throw new MenuStoreError('Your session needs to be refreshed. Sign in again.', 403, 'csrf_invalid')
    }
  }

  async function removeUnusedPhotos(beforeItems, afterItems) {
    const remaining = new Set(afterItems.map((item) => item.image?.src).filter(Boolean))
    const candidates = new Set(beforeItems.map((item) => item.image?.src).filter((src) => src && !remaining.has(src)))
    for (const src of candidates) {
      try { await imageStore.deletePublicUrl(src) } catch { /* Keep the menu save successful if storage cleanup is temporarily unavailable. */ }
    }
  }

  async function authenticated(req, res) {
    const session = getSession(req)
    if (!session) {
      reply(res, 401, { error: 'Authentication required.', code: 'unauthorized' })
      return null
    }
    if (req.method !== 'GET' && !normalizeOrigin(req, env.PUBLIC_ORIGIN, env.NODE_ENV === 'production')) {
      reply(res, 403, { error: 'Request origin is not allowed.', code: 'origin_invalid' })
      return null
    }
    res.setHeader('Set-Cookie', makeSessionCookie(cookieValue(req, SESSION_COOKIE), env))
    return session
  }

  async function handle(req, res) {
    let pathname
    try {
      pathname = new URL(req.url || '/', 'http://localhost').pathname.replace(/\/+$/, '') || '/'
    } catch {
      reply(res, 400, { error: 'Request path is invalid.', code: 'invalid_request' })
      return true
    }
    const method = req.method || 'GET'
    if (!pathname.startsWith('/api/')) return false

    try {
      if (pathname === '/api/menu' && method === 'GET') {
        const current = await store.get()
        reply(res, 200, { items: current.items, categories: current.categories, revision: current.revision })
        return true
      }

      if (pathname === '/api/admin/session' && method === 'GET') {
        const session = getSession(req)
        reply(res, 200, session ? { authenticated: true, csrfToken: session.csrfToken } : { authenticated: false })
        return true
      }

      if (pathname === '/api/admin/login' && method === 'POST') {
        if (!normalizeOrigin(req, env.PUBLIC_ORIGIN, env.NODE_ENV === 'production')) throw new MenuStoreError('Request origin is not allowed.', 403, 'origin_invalid')
        if (!env.ADMIN_PASSWORD_HASH) throw new MenuStoreError('Manager sign-in is not configured.', 503, 'auth_unconfigured')
        const clientKey = getClientKey(req)
        const now = clock()
        if (loginAttempts.size > 10000) {
          for (const [key, value] of loginAttempts) if (now - value.startedAt >= 15 * 60 * 1000) loginAttempts.delete(key)
        }
        const attempts = loginAttempts.get(clientKey)
        if (attempts && now - attempts.startedAt >= 15 * 60 * 1000) loginAttempts.delete(clientKey)
        const activeAttempts = loginAttempts.get(clientKey)
        if (activeAttempts?.count >= 5) throw new MenuStoreError('Too many sign-in attempts. Try again later.', 429, 'rate_limited')
        const body = await readBody(req)
        const password = typeof body?.password === 'string' ? body.password : ''
        if (activePasswordChecks >= 1) throw new MenuStoreError('Too many sign-in attempts. Try again later.', 429, 'rate_limited')
        activePasswordChecks += 1
        let valid = false
        try {
          valid = password.length <= 256 && await verifyPassword(password, env.ADMIN_PASSWORD_HASH)
        } finally {
          activePasswordChecks -= 1
        }
        if (!valid) {
          const bucket = loginAttempts.get(clientKey) || { startedAt: now, count: 0 }
          bucket.count += 1
          loginAttempts.set(clientKey, bucket)
          throw new MenuStoreError('Sign-in failed. Check your credentials and try again.', 401, 'invalid_credentials')
        }
        loginAttempts.delete(clientKey)
        if (sessions.size > 1000) {
          for (const [sessionId, current] of sessions) {
            if (now - current.lastActivity > SESSION_IDLE_MS || now - current.createdAt > SESSION_ABSOLUTE_MS) sessions.delete(sessionId)
          }
        }
        const token = randomBytes(32).toString('base64url')
        const csrfToken = randomBytes(32).toString('base64url')
        sessions.set(token, { csrfToken, createdAt: now, lastActivity: now })
        reply(res, 200, { authenticated: true, csrfToken }, { 'Set-Cookie': makeSessionCookie(token, env) })
        return true
      }

      if (pathname === '/api/admin/logout' && method === 'POST') {
        const session = await authenticated(req, res)
        if (!session) return true
        requireCsrf(req, session)
        sessions.delete(cookieValue(req, SESSION_COOKIE))
        const secure = env.NODE_ENV === 'production' || env.COOKIE_SECURE === 'true' ? '; Secure' : ''
        reply(res, 200, { authenticated: false }, { 'Set-Cookie': `${SESSION_COOKIE}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${secure}` })
        return true
      }

      if (pathname.startsWith('/api/admin/')) {
        const session = await authenticated(req, res)
        if (!session) return true
        if (method !== 'GET') requireCsrf(req, session)

        if (pathname === '/api/admin/images' && method === 'POST') {
          if (!imageStore.configured) {
            req.resume()
            throw new MenuStoreError('Photo storage is not configured. Set R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL on the server.', 503, 'image_storage_unconfigured')
          }
          const contentType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase()
          const bytes = await readImageBody(req)
          const details = inspectMenuImage(bytes, contentType)
          const uploaded = await imageStore.put(bytes, contentType, details.extension)
          reply(res, 201, { image: { src: uploaded.src, alt: 'Cafe In menu photograph', width: details.width, height: details.height } })
          return true
        }

        if (pathname === '/api/admin/images' && method === 'DELETE') {
          const body = await readBody(req)
          const src = typeof body?.src === 'string' ? body.src : ''
          await serializeMutation(async () => {
            const current = await store.get()
            if (current.items.some((item) => item.image?.src === src)) throw new MenuStoreError('This photo is still used by a menu item. Save the item without it before removing the file.', 409, 'image_in_use')
            const deleted = await imageStore.deletePublicUrl(src)
            if (!deleted) throw new MenuStoreError('The photo URL is not a managed Cafe In upload.', 400, 'invalid_image_url')
          })
          reply(res, 200, { deleted: true })
          return true
        }

        if (pathname === '/api/admin/menu' && method === 'GET') {
          const current = await store.get()
          reply(res, 200, current)
          return true
        }
        if (pathname === '/api/admin/export' && method === 'GET') {
          const current = await store.get()
          reply(res, 200, { schemaVersion: 1, revision: current.revision, categories: current.categories, items: current.items })
          return true
        }
        if (pathname === '/api/admin/import/preview' && method === 'POST') {
          const backup = await readBody(req)
          const current = await store.get()
          const imported = validateBackup(backup, current.categories, { currentItems: current.items, publicImageBase: imageStore.publicBase || '' })
          const currentById = new Map(current.items.map((item) => [item.id, item]))
          const incomingById = new Map(imported.items.map((item) => [item.id, item]))
          const added = imported.items.filter((item) => !currentById.has(item.id)).map((item) => item.id)
          const removed = current.items.filter((item) => !incomingById.has(item.id)).map((item) => item.id)
          const updated = imported.items.filter((item) => currentById.has(item.id) && !isDeepStrictEqual(currentById.get(item.id), item)).map((item) => item.id)
          reply(res, 200, { baseRevision: current.revision, added, updated, removed, itemCount: imported.items.length })
          return true
        }
        if (pathname === '/api/admin/import/apply' && method === 'POST') {
          const body = await readBody(req)
          if (body?.confirmReplace !== true) throw new MenuStoreError('Confirm the menu replacement before applying this backup.', 400, 'confirmation_required')
          const revision = Number(req.headers['if-match']?.replaceAll('"', ''))
          const saved = await serializeMutation(async () => {
            const current = await store.get()
            const imported = validateBackup(body.backup, current.categories, { currentItems: current.items, publicImageBase: imageStore.publicBase || '' })
            const result = await store.replace(imported.items, revision)
            await removeUnusedPhotos(current.items, result.items)
            return result
          })
          reply(res, 200, { revision: saved.revision, itemCount: saved.items.length })
          return true
        }

        const itemMatch = pathname.match(/^\/api\/admin\/menu\/([a-z0-9-]+)$/)
        if (pathname === '/api/admin/menu' && method === 'POST') {
          const body = await readBody(req)
          const revision = Number(req.headers['if-match']?.replaceAll('"', ''))
          const saved = await serializeMutation(async () => {
            const current = await store.get()
            return store.replace([...current.items, body], revision)
          })
          reply(res, 201, { item: saved.items.find((item) => item.id === body.id), revision: saved.revision })
          return true
        }
        if (itemMatch && (method === 'PUT' || method === 'DELETE')) {
          const id = decodeURIComponent(itemMatch[1])
          const revision = Number(req.headers['if-match']?.replaceAll('"', ''))
          const replacement = method === 'PUT' ? await readBody(req) : null
          const saved = await serializeMutation(async () => {
            const current = await store.get()
            if (!current.items.some((item) => item.id === id)) throw new MenuStoreError('Menu item was not found.', 404, 'not_found')
            const items = method === 'DELETE'
              ? current.items.filter((item) => item.id !== id)
              : current.items.map((item) => item.id === id ? { ...replacement, id } : item)
            const result = await store.replace(items, revision)
            await removeUnusedPhotos(current.items, result.items)
            return result
          })
          reply(res, 200, { item: saved.items.find((item) => item.id === id) || null, revision: saved.revision })
          return true
        }
      }

      throw new MenuStoreError('API endpoint was not found.', 404, 'not_found')
    } catch (error) {
      const known = error instanceof MenuStoreError
      const status = known ? error.status : 500
      const message = known ? error.message : 'The request could not be completed.'
      const code = known ? error.code : 'internal_error'
      reply(res, status, { error: message, code })
      return true
    }
  }

  return async (req, res, next) => {
    const handled = await handle(req, res)
    if (!handled) next?.()
  }
}

export function makePasswordHash(password, salt = randomBytes(16)) {
  return scrypt(password, salt, 64, SCRYPT_OPTIONS).then((hash) => `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`)
}
