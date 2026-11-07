import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import adminApi from '../api/admin.mjs'
import { createSanityApiHandler } from './sanity-api.mjs'
import { restoreAdminPath } from './vercel-admin-route.mjs'
import { loadSeedMenu } from './seed.mjs'
import { getMenuSectionMappings, getCategoryForMenuSection } from '../shared/menu-taxonomy.mjs'

const scrypt = promisify(scryptCallback)
async function makePasswordHash(password) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64, { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 })
  return 'scrypt$' + salt.toString('hex') + '$' + hash.toString('hex')
}

const categories = [{ id: 'beverages', label: 'Coffee & Beverages', short: 'Coffee', blurb: 'Coffee', _updatedAt: '2026-01-01T00:00:00Z', _id: 'drafts.menuCategory-beverages' }]
const rawItem = { id: 'espresso', name: 'Espresso', price: 50, categoryId: 'beverages', section: 'Essence of Espresso', description: 'A short coffee.', isSoldOut: false, badge: 'Bestseller', order: 0, _updatedAt: '2026-01-02T00:00:00Z', _rev: 'espresso-rev-1', _id: 'drafts.menuItem-espresso', image: { asset: { _ref: 'image-abc123-1200x800-jpg' }, alt: 'Espresso', width: 1200, height: 800 } }
const seed = { categories: categories.map(({ _id, _updatedAt, ...entry }) => entry), items: [{ id: 'fallback', name: 'Fallback', price: 10, category: 'beverages', section: 'Coffee', isSoldOut: false }, { id: 'canonical-espresso', name: 'Espresso', price: 50, category: 'beverages', section: 'Essence of Espresso', isSoldOut: false }] }
const publishedSeed = { categories: seed.categories, items: [{ id: rawItem.id, name: rawItem.name, price: rawItem.price, category: rawItem.categoryId, section: rawItem.section, isSoldOut: false }] }
const env = { NODE_ENV: 'development', PUBLIC_ORIGIN: 'https://cafe-in.test', ADMIN_PASSWORD_HASH: '', ADMIN_SESSION_SECRET: 's'.repeat(48), SANITY_API_TOKEN: 'server-only' }
const imageUrlBuilder = () => ({ image: (image) => ({ auto: () => ({ fit: () => ({ url: () => 'https://cdn.sanity.io/images/kgt3bhzl/production/' + image.asset._ref }) }) }) })

test('Vercel routes menu deep links to the SPA and bundles the API seed', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.equal(config.functions['api/**/*.mjs'].includeFiles, 'dist/menu-seed.json')
  assert.ok(config.rewrites.some(({ source, destination }) => source === '/menu' && destination === '/'))
  assert.ok(config.rewrites.some(({ source, destination }) => source === '/menu/:path*' && destination === '/'))
  assert.ok(config.rewrites.some(({ source, destination }) => source === '/digital-menu' && destination === '/'))
  assert.ok(config.rewrites.some(({ source, destination }) => source === '/digital-menu/:path*' && destination === '/'))
  assert.ok(config.rewrites.some(({ source, destination }) => source === '/api/admin/:route*' && destination === '/api/admin?__cafeInAdminRoute=:route*'))
  assert.ok(config.rewrites.findIndex(({ source }) => source.startsWith('/api/admin/')) < config.rewrites.findIndex(({ source }) => source === '/menu'))
  assert.ok(!config.rewrites.some(({ source, destination }) => source.startsWith('/api/') && destination === '/'))
})

test('admin rewrite restores nested endpoint paths and rejects malformed routes', () => {
  const sessionRequest = { url: '/api/admin?__cafeInAdminRoute=session' }
  assert.equal(restoreAdminPath(sessionRequest), true)
  assert.equal(sessionRequest.url, '/api/admin/session')

  const itemRequest = { url: '/api/admin?__cafeInAdminRoute=menu/espresso&view=edit' }
  assert.equal(restoreAdminPath(itemRequest), true)
  assert.equal(itemRequest.url, '/api/admin/menu/espresso?view=edit')

  const traversalRequest = { url: '/api/admin?__cafeInAdminRoute=../menu' }
  assert.equal(restoreAdminPath(traversalRequest), false)
  assert.equal(traversalRequest.url, '/api/admin?__cafeInAdminRoute=../menu')
})

test('Vercel admin function dispatches a rewritten nested session route', async () => {
  const res = response()
  const request = {
    url: '/api/admin?__cafeInAdminRoute=session',
    method: 'GET',
    headers: {},
  }
  await adminApi(request, res)
  assert.equal(request.url, '/api/admin/session')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { authenticated: false })
})

function fakeClient({ fail = false, categoryDocs = categories, itemDocs = [rawItem] } = {}) {
  const fetch = async (query) => {
    if (fail) throw new Error('Sanity unavailable')
    if (query.includes('isArchived == true')) return itemDocs.filter((item) => item.isArchived === true).map(({ id }) => ({ id }))
    if (query.includes('_type == \"menuCategory\"')) return categoryDocs
    if (query.includes('_type == \"menuItem\"')) return itemDocs
    if (query.includes('_id in path(\"drafts.*\")')) return query.includes('menuCategory') ? categoryDocs : itemDocs
    return null
  }
  return { fetch, withConfig: () => ({ fetch }), assets: { upload: async () => ({ _id: rawItem.image.asset._ref, url: 'https://cdn.sanity.io/photo.jpg' }) }, create: async (doc) => doc, createOrReplace: async (doc) => doc, transaction: () => ({ delete() { return this }, create() { return this }, patch() { return this }, createOrReplace() { return this }, commit: async () => ({}) }), action: async () => ({}), patch: () => ({ ifRevisionId() { return this }, set() { return this }, unset() { return this }, commit: async () => ({}) }) }
}

test('canonical menu sections map to their existing parent categories without ambiguity', () => {
  const canonical = loadSeedMenu()
  const mappings = getMenuSectionMappings(canonical.items, canonical.categories)
  assert.equal(mappings.length, 13)
  assert.equal(getCategoryForMenuSection('Essence of Espresso', mappings), 'beverages')
  assert.equal(getCategoryForMenuSection('Coffee & Beverages', mappings), null)
  assert.equal(getCategoryForMenuSection('Crisp & Quick', mappings), 'quick-bites')
  assert.equal(getCategoryForMenuSection('Pastas', mappings), 'meals')
  assert.equal(getCategoryForMenuSection('Sweet Temptations', mappings), 'desserts')
  assert.equal(getCategoryForMenuSection('Unconfigured section', mappings), null)
})

test('admin menu writes derive category from the selected section and reject unknown sections', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  const canonical = loadSeedMenu()
  const categoryDocs = canonical.categories.map((category) => ({ id: category.id, label: category.label, short: category.short, blurb: category.blurb, _updatedAt: '2026-01-01T00:00:00Z', _id: `drafts.menuCategory-${category.id}` }))
  const taxonomySeed = { categories: canonical.categories, items: canonical.items }
  let savedDocument
  let writes = 0
  const client = fakeClient({ categoryDocs })
  const writeClient = fakeClient({ categoryDocs })
  writeClient.create = async (document) => { savedDocument = document; writes += 1; return document }
  const handler = createSanityApiHandler({ env: secureEnv, client, writeClient, seed: taxonomySeed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const current = await call(handler, '/api/admin/menu', { headers: { cookie } })
  const headers = { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken, 'if-match': `"${current.body.revision}"` }

  const created = await call(handler, '/api/admin/menu', {
    method: 'POST', headers,
    body: { id: 'new-fries', name: 'New fries', price: 120, category: 'desserts', section: 'Crisp & Quick', isSoldOut: false },
  })
  assert.equal(created.status, 201)
  assert.equal(savedDocument.category._ref, 'menuCategory-quick-bites')
  assert.equal(writes, 1)

  const edited = await call(handler, '/api/admin/menu/espresso', {
    method: 'PUT', headers,
    body: { ...current.body.items[0], category: 'beverages', section: 'Pastas' },
  })
  assert.equal(edited.status, 200)
  assert.equal(savedDocument.category._ref, 'menuCategory-meals')
  assert.equal(savedDocument.image.asset._ref, rawItem.image.asset._ref)

  const invalid = await call(handler, '/api/admin/menu', {
    method: 'POST', headers,
    body: { id: 'unknown-section-item', name: 'Unknown section item', price: 100, category: 'beverages', section: 'Not a configured section', isSoldOut: false },
  })
  assert.equal(invalid.status, 400)
  assert.equal(invalid.body.code, 'invalid_section')
  assert.equal(writes, 2)

  const badBackup = await call(handler, '/api/admin/import/preview', {
    method: 'POST', headers,
    body: { schemaVersion: 1, revision: current.body.revision, categories: current.body.categories, items: [{ id: 'backup-item', name: 'Backup item', price: 20, category: 'beverages', section: 'Not a configured section', isSoldOut: false }] },
  })
  assert.equal(badBackup.status, 400)
  assert.equal(badBackup.body.code, 'invalid_section')
  assert.equal(writes, 2)
})

function response() {
  return { headers: {}, writeHead(status, headers) { this.status = status; this.headers = headers }, end(body) { this.body = JSON.parse(body) } }
}

async function call(handler, url, options = {}) {
  const res = response()
  await handler({ url, method: options.method || 'GET', headers: options.headers || {}, body: options.body }, res)
  return res
}

test('public menu maps published Sanity content and image metadata', async () => {
  const handler = createSanityApiHandler({ env, client: fakeClient(), writeClient: fakeClient(), seed: publishedSeed, imageUrlBuilder })
  const result = await call(handler, '/api/menu')
  assert.equal(result.status, 200)
  assert.equal(result.body.items[0].id, 'espresso')
  assert.equal(result.body.items[0].image.assetId, rawItem.image.asset._ref)
  assert.equal(result.body.items[0].image.alt, 'Espresso')
  assert.equal(result.body.categories[0].id, 'beverages')
})

test('public menu falls back to the tracked seed when Sanity fails', async () => {
  const handler = createSanityApiHandler({ env, client: fakeClient({ fail: true }), writeClient: null, seed, imageUrlBuilder })
  const result = await call(handler, '/api/menu')
  assert.equal(result.status, 200)
  assert.equal(result.body.source, 'fallback')
  assert.equal(result.body.items[0].id, 'fallback')
})

test('partially published Sanity content stays hidden behind the complete fallback', async () => {
  const handler = createSanityApiHandler({ env, client: fakeClient(), writeClient: fakeClient(), seed, imageUrlBuilder })
  const result = await call(handler, '/api/menu')
  assert.equal(result.status, 200)
  assert.equal(result.body.items[0].id, 'fallback')
  assert.equal(result.body.source, 'fallback')
})

test('draft preview is not exposed through the production API handler', async () => {
  const handler = createSanityApiHandler({ env, client: fakeClient(), writeClient: fakeClient(), seed, imageUrlBuilder })
  const result = await call(handler, '/api/preview/sanity-drafts')
  assert.equal(result.status, 404)
})

test('public menu never returns Sanity draft metadata and known API paths enforce methods', async () => {
  const handler = createSanityApiHandler({ env, client: fakeClient(), writeClient: fakeClient(), seed, imageUrlBuilder })
  const menu = await call(handler, '/api/menu')
  assert.equal(menu.status, 200)
  assert.doesNotMatch(JSON.stringify(menu.body), /drafts\.|_originalId|_originalRev|"_id"/)

  const session = await call(handler, '/api/admin/session')
  assert.equal(session.status, 200)
  assert.equal(session.body.authenticated, false)

  const adminMenu = await call(handler, '/api/admin/menu')
  assert.equal(adminMenu.status, 401)
  assert.equal(adminMenu.headers['Content-Type'], 'application/json; charset=utf-8')

  const wrongMethod = await call(handler, '/api/admin/login', { method: 'GET' })
  assert.equal(wrongMethod.status, 405)
  assert.equal(wrongMethod.headers.Allow, 'POST')

  const originCheck = await call(handler, '/api/admin/login', { method: 'POST' })
  assert.equal(originCheck.status, 403)
})

test('unknown API routes return sanitized JSON 404 responses', async () => {
  const handler = createSanityApiHandler({ env, client: fakeClient(), writeClient: fakeClient(), seed, imageUrlBuilder })
  const result = await call(handler, '/api/not-a-real-route')
  assert.equal(result.status, 404)
  assert.equal(result.body.code, 'not_found')
  assert.equal(result.headers['Content-Type'], 'application/json; charset=utf-8')
})

test('manager authentication fails closed without configured Sanity writes', async () => {
  const handler = createSanityApiHandler({ env: { ...env, ADMIN_PASSWORD_HASH: 'configured' }, client: fakeClient(), writeClient: null, seed, imageUrlBuilder })
  const result = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: env.PUBLIC_ORIGIN }, body: { password: 'secret' } })
  assert.equal(result.status, 503)
})

test('Vercel manager login accepts the bcrypt hash and retains legacy scrypt fallback until removed', async () => {
  const modernPassword = 'synthetic bcrypt manager password'
  const legacyPassword = 'synthetic legacy manager password'
  const secureEnv = {
    ...env,
    MANAGER_PASSWORD_HASH: await bcrypt.hash(modernPassword, 4),
    ADMIN_PASSWORD_HASH: await makePasswordHash(legacyPassword),
  }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient: fakeClient(), seed, imageUrlBuilder })

  const modernLogin = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: modernPassword } })
  assert.equal(modernLogin.status, 200)
  assert.match(modernLogin.headers['Set-Cookie'], /HttpOnly; SameSite=Strict/)

  const legacyLogin = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: legacyPassword } })
  assert.equal(legacyLogin.status, 200)

  const noFallbackHandler = createSanityApiHandler({ env: { ...secureEnv, ADMIN_PASSWORD_HASH: '' }, client: fakeClient(), writeClient: fakeClient(), seed, imageUrlBuilder })
  const rejectedLegacy = await call(noFallbackHandler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: legacyPassword } })
  assert.equal(rejectedLegacy.status, 401)

  const wrongPassword = await call(noFallbackHandler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'invalid synthetic password' } })
  assert.equal(wrongPassword.status, 401)

  const unconfigured = createSanityApiHandler({ env: { ...secureEnv, MANAGER_PASSWORD_HASH: '', ADMIN_PASSWORD_HASH: '' }, client: fakeClient(), writeClient: fakeClient(), seed, imageUrlBuilder })
  const missingHash = await call(unconfigured, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: modernPassword } })
  assert.equal(missingHash.status, 503)
  assert.equal(missingHash.body.code, 'auth_unconfigured')
})

test('production manager login accepts only exact configured HTTPS origins before password verification', async () => {
  const secureEnv = {
    ...env,
    NODE_ENV: 'production',
    PUBLIC_ORIGIN: 'https://cafe-in-eight.vercel.app, https://www.cafein.co.in',
    ADMIN_PASSWORD_HASH: 'invalid-hash-for-origin-test',
  }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient: fakeClient(), seed, imageUrlBuilder })

  for (const origin of ['https://cafe-in-eight.vercel.app', 'https://www.cafein.co.in']) {
    const accepted = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin }, body: { password: 'not checked for origin test' } })
    assert.equal(accepted.status, 401, `${origin} passes the origin gate and reaches credential verification`)
    assert.equal(accepted.body.code, 'invalid_credentials')
  }

  for (const origin of ['https://attacker.invalid', 'http://www.cafein.co.in']) {
    const rejected = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin }, body: { password: 'not checked for origin test' } })
    assert.equal(rejected.status, 403, `${origin} is rejected before credential verification`)
    assert.equal(rejected.body.code, 'origin_invalid')
  }
})

test('manager writes require a signed session, same-site origin, and CSRF token', async () => {
  const passwordHash = await makePasswordHash('test password')
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: passwordHash }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient: fakeClient(), seed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  assert.equal(login.status, 200)
  assert.match(login.headers['Set-Cookie'], /HttpOnly; SameSite=Strict/)
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  assert.equal(session.body.authenticated, true)
  const missingCsrf = await call(handler, '/api/admin/publish', { method: 'POST', headers: { cookie, origin: secureEnv.PUBLIC_ORIGIN }, body: { scope: 'menu', confirm: true } })
  assert.equal(missingCsrf.status, 403)
  const crossOrigin = await call(handler, '/api/admin/publish', { method: 'POST', headers: { cookie, origin: 'https://attacker.invalid', 'x-csrf-token': session.body.csrfToken }, body: { scope: 'menu', confirm: true } })
  assert.equal(crossOrigin.status, 403)
})

test('invalid Sanity data produces a safe menu fallback instead of leaking drafts', async () => {
  const invalid = { fetch: async () => [] }
  const handler = createSanityApiHandler({ env, client: invalid, writeClient: null, seed, imageUrlBuilder })
  const result = await call(handler, '/api/menu')
  assert.equal(result.status, 200)
  assert.equal(result.body.items[0].id, 'fallback')
})

test('manager menu saves persist a draft and do not publish implicitly', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  let savedDocument
  let publishCalls = 0
  const writeClient = fakeClient()
  writeClient.create = async (document) => { savedDocument = document; return document }
  writeClient.action = async () => { publishCalls += 1 }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient, seed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const current = await call(handler, '/api/admin/menu', { headers: { cookie } })
  const update = { ...current.body.items[0], price: 55, image: { src: 'https://cdn.sanity.io/menu.jpg', assetId: rawItem.image.asset._ref, alt: 'Espresso', width: 1200, height: 800 } }
  const saved = await call(handler, '/api/admin/menu/espresso', {
    method: 'PUT',
    headers: { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken, 'if-match': '"' + current.body.revision + '"' },
    body: update,
  })
  assert.equal(saved.status, 200)
  assert.equal(savedDocument._id, 'drafts.menuItem-espresso')
  assert.equal(savedDocument.category._weak, true)
  assert.equal(savedDocument.image.asset._ref, rawItem.image.asset._ref)
  assert.equal(publishCalls, 0)
})

test('updating an existing draft uses its revision and never blindly replaces it', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  const existingDraft = { _id: 'drafts.menuItem-espresso', _rev: 'revision-before-edit' }
  let guardedRevision
  let createOrReplaceCalls = 0
  const writeClient = fakeClient()
  writeClient.withConfig = () => ({ fetch: async (query) => query.includes('_id == $draftId') ? existingDraft : fakeClient().fetch(query) })
  writeClient.patch = (id) => ({
    ifRevisionId(revision) { guardedRevision = [id, revision]; return this },
    set() { return this },
    unset() { return this },
    commit: async () => ({}),
  })
  writeClient.createOrReplace = async () => { createOrReplaceCalls += 1 }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient, seed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const current = await call(handler, '/api/admin/menu', { headers: { cookie } })
  const update = { ...current.body.items[0], price: 55 }
  const saved = await call(handler, '/api/admin/menu/espresso', {
    method: 'PUT',
    headers: { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken, 'if-match': '"' + current.body.revision + '"' },
    body: update,
  })
  assert.equal(saved.status, 200)
  assert.deepEqual(guardedRevision, ['drafts.menuItem-espresso', 'revision-before-edit'])
  assert.equal(createOrReplaceCalls, 0)
})

test('manager endpoints reject missing authentication and tampered session cookies', async () => {
  const handler = createSanityApiHandler({ env, client: fakeClient(), writeClient: fakeClient(), seed, imageUrlBuilder })
  const unauthenticated = await call(handler, '/api/admin/menu')
  assert.equal(unauthenticated.status, 401)
  const invalid = await call(handler, '/api/admin/session', { headers: { cookie: 'cafein_admin_session=abc.def' } })
  assert.equal(invalid.body.authenticated, false)
})

test('Vercel manager blocks published item deletion until a reviewed Studio workflow exists', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  let mutations = 0
  const writeClient = fakeClient()
  writeClient.transaction = () => { mutations += 1; return fakeClient().transaction() }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient, seed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const result = await call(handler, '/api/admin/menu/espresso', {
    method: 'DELETE',
    headers: { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken },
  })
  assert.equal(result.status, 409)
  assert.equal(result.body.code, 'delete_requires_studio')
  assert.equal(mutations, 0)
})

test('archive and restore are authenticated, revision guarded, idempotent draft-only operations', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  const itemDocs = [{ ...rawItem }]
  let creates = 0
  let patches = 0
  const client = fakeClient({ itemDocs })
  const writeClient = fakeClient({ itemDocs })
  writeClient.create = async (document) => {
    creates += 1
    Object.assign(itemDocs[0], { isArchived: document.isArchived, _rev: `item-rev-${creates}` })
    return document
  }
  writeClient.withConfig = (config) => ({
    fetch: async (query, params = {}) => {
      if (query.includes('_id == $draftId')) return config.perspective === 'raw' && params.draftId === 'drafts.menuItem-espresso' && creates ? { _id: params.draftId, _rev: itemDocs[0]._rev } : null
      if (query.includes('menuCategory')) return categories
      if (query.includes('isArchived == true')) return itemDocs.filter((item) => item.isArchived).map(({ id }) => ({ id }))
      if (query.includes('menuItem')) return itemDocs
      return null
    },
  })
  writeClient.patch = (id) => {
    let changes = {}
    return {
      ifRevisionId() { return this },
      set(value) { changes = value; return this },
      unset() { return this },
      async commit() { patches += 1; assert.equal(id, 'drafts.menuItem-espresso'); Object.assign(itemDocs[0], changes, { _rev: `item-rev-patch-${patches}` }); return {} },
    }
  }
  const handler = createSanityApiHandler({ env: secureEnv, client, writeClient, seed: publishedSeed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const current = await call(handler, '/api/admin/menu', { headers: { cookie } })
  const headers = { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken, 'if-match': `"${current.body.revision}"` }

  assert.equal((await call(handler, '/api/admin/menu/espresso/archive', { method: 'POST' })).status, 401)
  const stale = await call(handler, '/api/admin/menu/espresso/archive', { method: 'POST', headers: { ...headers, 'if-match': '"0"' } })
  assert.equal(stale.status, 409)
  const archived = await call(handler, '/api/admin/menu/espresso/archive', { method: 'POST', headers })
  assert.equal(archived.status, 200)
  assert.equal(itemDocs[0].isArchived, true)
  assert.equal(itemDocs[0].name, rawItem.name)
  assert.equal(itemDocs[0].price, rawItem.price)
  assert.equal(creates, 1)
  const manager = await call(handler, '/api/admin/menu', { headers: { cookie } })
  assert.equal(manager.body.items[0].isArchived, true)
  const publicMenu = await call(handler, '/api/menu')
  assert.deepEqual(publicMenu.body.items, [])
  const repeated = await call(handler, '/api/admin/menu/espresso/archive', { method: 'POST', headers })
  assert.equal(repeated.status, 200)
  assert.equal(repeated.body.unchanged, true)
  assert.equal(creates, 1)
  const restored = await call(handler, '/api/admin/menu/espresso/restore', { method: 'POST', headers: { ...headers, 'if-match': `"${manager.body.revision}"` } })
  assert.equal(restored.status, 200)
  assert.equal(itemDocs[0].isArchived, false)
  assert.equal(patches, 1)
  assert.equal(itemDocs[0].name, rawItem.name)
})

test('archive routes reject invalid IDs and unsupported methods without mutation', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  let writes = 0
  const writeClient = fakeClient()
  writeClient.create = async () => { writes += 1 }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient, seed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const headers = { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken, 'if-match': '"1"' }
  const missingCsrf = await call(handler, '/api/admin/menu/espresso/archive', { method: 'POST', headers: { cookie, 'if-match': '"1"' } })
  assert.equal(missingCsrf.status, 403)
  const invalid = await call(handler, '/api/admin/menu/bad_id/archive', { method: 'POST', headers })
  assert.equal(invalid.status, 400)
  assert.equal(invalid.body.code, 'invalid_item')
  const method = await call(handler, '/api/admin/menu/espresso/archive', { method: 'DELETE', headers })
  assert.equal(method.status, 405)
  const current = await call(handler, '/api/admin/menu', { headers: { cookie } })
  const directToggle = await call(handler, '/api/admin/menu/espresso', { method: 'PUT', headers: { ...headers, 'if-match': `"${current.body.revision}"` }, body: { ...current.body.items[0], isArchived: true } })
  assert.equal(directToggle.status, 409)
  assert.equal(directToggle.body.code, 'archive_action_required')
  assert.equal(writes, 0)
})

test('public menu fails closed when draft archive state cannot be verified', async () => {
  const handler = createSanityApiHandler({ env, client: fakeClient(), writeClient: fakeClient({ fail: true }), seed, imageUrlBuilder })
  const result = await call(handler, '/api/menu')
  assert.equal(result.status, 503)
  assert.equal(result.body.code, 'archive_state_unavailable')
  assert.doesNotMatch(JSON.stringify(result.body), /drafts\.|_rev|Sanity/i)
})

test('tracked-seed fallback also excludes IDs archived in drafts', async () => {
  const archiveSeed = { categories: publishedSeed.categories, items: [...publishedSeed.items, { id: 'missing-public-item', name: 'Fallback item', price: 20, category: 'beverages', section: 'Essence of Espresso', isSoldOut: false }] }
  const handler = createSanityApiHandler({
    env,
    client: fakeClient({ itemDocs: [{ ...rawItem, isArchived: false }] }),
    writeClient: fakeClient({ itemDocs: [{ ...rawItem, isArchived: true }] }),
    seed: archiveSeed,
    imageUrlBuilder,
  })
  const result = await call(handler, '/api/menu')
  assert.equal(result.status, 200)
  assert.equal(result.body.source, 'fallback')
  assert.equal(result.body.items.some(({ id }) => id === 'espresso'), false)
})

test('menu item validation rejects unsupported fields before persistence', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  let writes = 0
  const writeClient = fakeClient()
  writeClient.createOrReplace = async () => { writes += 1 }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient, seed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const current = await call(handler, '/api/admin/menu', { headers: { cookie } })
  const result = await call(handler, '/api/admin/menu', {
    method: 'POST',
    headers: { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken, 'if-match': '"' + current.body.revision + '"' },
    body: { id: 'new-drink', name: 'New drink', price: 10, category: 'beverages', section: 'Coffee', isSoldOut: false, _type: 'sanity.imageAsset' },
  })
  assert.equal(result.status, 400)
  assert.equal(writes, 0)
})

test('explicit publish orders categories first and holds the example record for review', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  const categoryDrafts = [{ ...categories[0], _id: 'drafts.menuCategory-beverages' }]
  const itemDrafts = [rawItem, { ...rawItem, id: 'example', _id: 'drafts.menuItem-example', name: 'Example' }]
  const actions = []
  const writeClient = fakeClient()
  writeClient.withConfig = (config) => ({
    fetch: async (query) => {
      if (config.perspective === 'raw') return query.includes('menuCategory') ? categoryDrafts : itemDrafts
      return query.includes('menuCategory') ? categories : itemDrafts
    },
  })
  writeClient.action = async (action) => { actions.push(action); return {} }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient, seed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const result = await call(handler, '/api/admin/publish', { method: 'POST', headers: { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken }, body: { scope: 'menu', confirm: true } })
  assert.equal(result.status, 200)
  assert.deepEqual(actions.map((action) => action.publishedId), ['menuCategory-beverages', 'menuItem-espresso'])
  assert.equal(result.body.heldForReview[0], 'example')
})

test('authenticated image uploads validate bytes and store assets through Sanity', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  const bytes = Buffer.from('safe-test-image')
  let stored = 0
  const writeClient = fakeClient()
  writeClient.assets.upload = async (type, value) => {
    assert.equal(type, 'image')
    assert.deepEqual(value, bytes)
    stored += 1
    return { _id: rawItem.image.asset._ref, url: 'https://cdn.sanity.io/uploaded.jpg' }
  }
  const handler = createSanityApiHandler({
    env: secureEnv,
    client: fakeClient(),
    writeClient,
    seed,
    imageUrlBuilder,
    imageInspector: () => ({ extension: 'jpg', width: 320, height: 240 }),
  })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const upload = await call(handler, '/api/admin/images', {
    method: 'POST',
    headers: { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken, 'content-type': 'image/jpeg' },
    body: bytes,
  })
  assert.equal(upload.status, 201)
  assert.equal(stored, 1)
  assert.equal(upload.body.image.assetId, rawItem.image.asset._ref)
})

test('image upload reuses a matching Sanity asset instead of creating a duplicate', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  const bytes = Buffer.from('same-image-bytes')
  let uploads = 0
  const writeClient = fakeClient()
  writeClient.fetch = async (query) => query.includes('sanity.imageAsset') ? { _id: rawItem.image.asset._ref, url: 'https://cdn.sanity.io/existing.jpg' } : null
  writeClient.assets.upload = async () => { uploads += 1; throw new Error('duplicate upload was attempted') }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient, seed, imageUrlBuilder, imageInspector: () => ({ extension: 'jpg', width: 320, height: 240 }) })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const response = await call(handler, '/api/admin/images', { method: 'POST', headers: { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken, 'content-type': 'image/jpeg' }, body: bytes })
  assert.equal(response.status, 201)
  assert.equal(uploads, 0)
  assert.equal(response.body.image.assetId, rawItem.image.asset._ref)
})

test('public Sanity menu excludes the flagged example record', async () => {
  const example = { ...rawItem, id: 'example', name: 'Example', _id: 'menuItem-example' }
  const client = { fetch: async (query) => query.includes('menuCategory') ? categories : [rawItem, example] }
  const handler = createSanityApiHandler({ env, client, writeClient: fakeClient(), seed: publishedSeed, imageUrlBuilder })
  const result = await call(handler, '/api/menu')
  assert.equal(result.status, 200)
  assert.deepEqual(result.body.items.map((item) => item.id), ['espresso'])
})

test('backup removals are blocked before any Sanity document mutation', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  let writes = 0
  const writeClient = fakeClient()
  writeClient.transaction = () => { writes += 1; return fakeClient().transaction() }
  writeClient.createOrReplace = async () => { writes += 1 }
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient, seed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const current = await call(handler, '/api/admin/menu', { headers: { cookie } })
  const response = await call(handler, '/api/admin/import/apply', {
    method: 'POST',
    headers: { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken, 'if-match': '"' + current.body.revision + '"' },
    body: { confirmReplace: true, backup: { schemaVersion: 1, revision: current.body.revision, categories: current.body.categories, items: [] } },
  })
  assert.equal(response.status, 409)
  assert.equal(response.body.code, 'draft_removal_requires_review')
  assert.equal(writes, 0)
})

test('backup apply resumes with revision-guarded draft patches and deterministic creates', async () => {
  const secureEnv = { ...env, ADMIN_PASSWORD_HASH: await makePasswordHash('test password') }
  const mutations = []
  const writeClient = fakeClient()
  writeClient.transaction = () => ({
    patch(id, callback) {
      let revision
      const patch = {
        ifRevisionId(value) { revision = value; return this },
        set() { return this },
        unset() { return this },
      }
      callback(patch)
      mutations.push({ type: 'patch', id, revision })
      return this
    },
    create(document) { mutations.push({ type: 'create', document }); return this },
    commit: async () => ({}),
  })
  const handler = createSanityApiHandler({ env: secureEnv, client: fakeClient(), writeClient, seed, imageUrlBuilder })
  const login = await call(handler, '/api/admin/login', { method: 'POST', headers: { origin: secureEnv.PUBLIC_ORIGIN }, body: { password: 'test password' } })
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  const session = await call(handler, '/api/admin/session', { headers: { cookie } })
  const current = await call(handler, '/api/admin/menu', { headers: { cookie } })
  const backup = {
    schemaVersion: 1,
    revision: current.body.revision,
    categories: current.body.categories,
    items: [...current.body.items, { id: 'new-latte', name: 'New Latte', price: 80, category: 'beverages', section: 'Essence of Espresso', isSoldOut: false }],
  }
  const applied = await call(handler, '/api/admin/import/apply', {
    method: 'POST',
    headers: { cookie, origin: secureEnv.PUBLIC_ORIGIN, 'x-csrf-token': session.body.csrfToken, 'if-match': '"' + current.body.revision + '"' },
    body: { backup, confirmReplace: true },
  })
  assert.equal(applied.status, 200)
  assert.equal(applied.body.itemCount, 2)
  assert.deepEqual(mutations.map(({ type }) => type), ['patch', 'create'])
  assert.deepEqual(mutations[0], { type: 'patch', id: 'drafts.menuItem-espresso', revision: 'espresso-rev-1' })
  assert.equal(mutations[1].document._id, 'drafts.menuItem-new-latte')
})
