import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createApiHandler, makePasswordHash } from './api.mjs'
import { convertLegacyMenuOverrides } from '../src/digital-menu/legacyMenuMigration.mjs'

const categories = [{ id: 'beverages', label: 'Beverages', short: 'Coffee', blurb: 'Coffee and more.' }]
const latte = { id: 'latte', name: 'Latte', price: 80, category: 'beverages', section: 'Coffee', description: 'Milk and espresso.', isSoldOut: false }
const seed = { categories, items: [latte] }

test('manager source contains no demo PIN or browser-local authorization shortcut', async () => {
  const [storeSource, modalSource] = await Promise.all([
    readFile(new URL('../src/digital-menu/adminStore.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/digital-menu/DigitalMenuAdminModal.tsx', import.meta.url), 'utf8'),
  ])
  assert.doesNotMatch(`${storeSource}\n${modalSource}`, /1234|DEFAULT_PIN|admin_pin|Quick Demo|localStorage/)
})

test('legacy browser menu edits convert to a validated full-menu backup', () => {
  const snapshot = { revision: 4, categories, items: [{ ...latte, isSoldOut: false, badge: undefined }] }
  const backup = convertLegacyMenuOverrides(JSON.stringify({
    prices: { latte: 95 },
    soldOut: { latte: true },
    badges: { latte: 'chef-special' },
    descriptions: { latte: 'Saved browser description.' },
  }), snapshot)
  assert.equal(backup.schemaVersion, 1)
  assert.equal(backup.revision, 4)
  assert.equal(backup.items[0].price, 95)
  assert.equal(backup.items[0].isSoldOut, true)
  assert.equal(backup.items[0].badge, 'Chef Special')
  assert.equal(backup.items[0].description, 'Saved browser description.')
  assert.throws(() => convertLegacyMenuOverrides('{bad json', snapshot), /not valid JSON/)
  assert.throws(() => convertLegacyMenuOverrides(JSON.stringify({ prices: { latte: -1 } }), snapshot), /price value for latte is invalid/)
  assert.throws(() => convertLegacyMenuOverrides(JSON.stringify({ prices: { 'missing-item': 50 } }), snapshot), /no longer in the menu/)
})

async function withApi(t, options = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cafein-api-'))
  const env = { ADMIN_PASSWORD_HASH: await makePasswordHash('correct horse battery staple'), NODE_ENV: 'test', ...options.env }
  let now = 1_000_000
  const handler = createApiHandler({ seed, filePath: path.join(dir, 'menu.json'), env, clock: () => now, imageStore: options.imageStore })
  const server = createServer((req, res) => void handler(req, res, () => res.writeHead(404).end()))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const origin = `http://127.0.0.1:${address.port}`
  env.PUBLIC_ORIGIN = origin
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await rm(dir, { recursive: true, force: true })
  })
  return {
    origin,
    setTime(value) { now = value },
    async request(route, { method = 'GET', body, cookie, csrf, revision, withOrigin = true, originHeader = origin } = {}) {
      const headers = {}
      if (withOrigin) headers.Origin = originHeader
      if (cookie) headers.Cookie = cookie
      if (csrf) headers['X-CSRF-Token'] = csrf
      if (revision !== undefined) headers['If-Match'] = `"${revision}"`
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(body)
      }
      const response = await fetch(`${origin}${route}`, { method, headers, body })
      return { response, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] }
    },
    async raw(route, { method = 'POST', body, contentType, cookie, csrf, withOrigin = true } = {}) {
      const headers = { 'Content-Type': contentType }
      if (withOrigin) headers.Origin = origin
      if (cookie) headers.Cookie = cookie
      if (csrf) headers['X-CSRF-Token'] = csrf
      const response = await fetch(`${origin}${route}`, { method, headers, body })
      return { response, data: await response.json() }
    },
  }
}

const imageStore = {
  publicBase: 'https://images.cafein.test',
  configured: true,
  files: new Set(),
  async put(_bytes, _contentType, extension) {
    const src = `${this.publicBase}/menu/123e4567-e89b-12d3-a456-426614174000.${extension}`
    this.files.add(src)
    return { src }
  },
  async deletePublicUrl(src) {
    if (!this.files.has(src)) return false
    this.files.delete(src)
    return true
  },
}

function jpegFixture() {
  return Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x02, 0x00, 0x02, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0x00, 0x00, 0xff, 0xd9])
}

test('public menu works while privileged operations require an authenticated session and CSRF token', async (t) => {
  const api = await withApi(t)
  const publicResult = await api.request('/api/menu')
  assert.equal(publicResult.response.status, 200)
  assert.equal(publicResult.data.items[0].id, 'latte')
  assert.equal((await api.request('/api/admin/menu')).response.status, 401)

  const denied = await api.request('/api/admin/login', { method: 'POST', body: { password: 'wrong password' } })
  assert.equal(denied.response.status, 401)
  const loggedIn = await api.request('/api/admin/login', { method: 'POST', body: { password: 'correct horse battery staple' } })
  assert.equal(loggedIn.response.status, 200)
  assert.ok(loggedIn.cookie)
  assert.match(loggedIn.response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/)
  const deniedMutation = await api.request('/api/admin/menu', { method: 'POST', body: { ...latte, id: 'tea' }, cookie: loggedIn.cookie, revision: 1 })
  assert.equal(deniedMutation.response.status, 403)
  const badOrigin = await api.request('/api/admin/menu', { method: 'POST', body: { ...latte, id: 'tea' }, cookie: loggedIn.cookie, csrf: loggedIn.data.csrfToken, revision: 1, originHeader: 'https://attacker.example' })
  assert.equal(badOrigin.response.status, 403)

  const authorized = await api.request('/api/admin/menu', { method: 'POST', body: { ...latte, id: 'tea', name: 'Tea' }, cookie: loggedIn.cookie, csrf: loggedIn.data.csrfToken, revision: 1 })
  assert.equal(authorized.response.status, 201)
  const changed = await api.request('/api/admin/menu/tea', {
    method: 'PUT',
    body: { id: 'tea', name: 'Iced Tea', price: 120, category: 'beverages', section: 'Cold Drinks', description: 'Chilled tea.', isSoldOut: true, badge: 'Chef Special' },
    cookie: loggedIn.cookie,
    csrf: loggedIn.data.csrfToken,
    revision: 2,
  })
  assert.equal(changed.response.status, 200)
  const publicItems = (await api.request('/api/menu')).data.items
  assert.equal(publicItems.length, 2)
  assert.equal(publicItems.find((item) => item.id === 'tea').name, 'Iced Tea')
  assert.equal(publicItems.find((item) => item.id === 'tea').price, 120)
  assert.equal(publicItems.find((item) => item.id === 'tea').description, 'Chilled tea.')
  assert.equal(publicItems.find((item) => item.id === 'tea').isSoldOut, true)
  assert.equal(publicItems.find((item) => item.id === 'tea').badge, 'Chef Special')
  const deleted = await api.request('/api/admin/menu/tea', { method: 'DELETE', cookie: loggedIn.cookie, csrf: loggedIn.data.csrfToken, revision: 3 })
  assert.equal(deleted.response.status, 200)
  assert.equal((await api.request('/api/menu')).data.items.length, 1)
  const loggedOut = await api.request('/api/admin/logout', { method: 'POST', cookie: loggedIn.cookie, csrf: loggedIn.data.csrfToken })
  assert.equal(loggedOut.response.status, 200)
  assert.equal((await api.request('/api/admin/menu', { cookie: loggedIn.cookie })).response.status, 401)
})

test('expired sessions are rejected and failed logins are rate limited', async (t) => {
  const api = await withApi(t)
  const login = await api.request('/api/admin/login', { method: 'POST', body: { password: 'correct horse battery staple' } })
  api.setTime(1_000_000 + 31 * 60 * 1000)
  const expired = await api.request('/api/admin/menu', { cookie: login.cookie })
  assert.equal(expired.response.status, 401)

  const limitedApi = await withApi(t)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await limitedApi.request('/api/admin/login', { method: 'POST', body: { password: 'wrong password' } })
    assert.equal(result.response.status, 401)
  }
  const limited = await limitedApi.request('/api/admin/login', { method: 'POST', body: { password: 'correct horse battery staple' } })
  assert.equal(limited.response.status, 429)
})

test('admin export, preview, and atomic import share the public menu store', async (t) => {
  const api = await withApi(t)
  const login = await api.request('/api/admin/login', { method: 'POST', body: { password: 'correct horse battery staple' } })
  const auth = { cookie: login.cookie, csrf: login.data.csrfToken }
  const backup = (await api.request('/api/admin/export', auth)).data
  assert.equal(backup.schemaVersion, 1)
  const importPreview = await api.request('/api/admin/import/preview', { ...auth, method: 'POST', body: { ...backup, items: [{ ...latte, price: 95, isSoldOut: true }] } })
  assert.deepEqual(importPreview.data.updated, ['latte'])
  const applied = await api.request('/api/admin/import/apply', { ...auth, method: 'POST', revision: 1, body: { confirmReplace: true, backup: { ...backup, items: [{ ...latte, price: 95, isSoldOut: true }] } } })
  assert.equal(applied.response.status, 200)
  const publicMenu = await api.request('/api/menu')
  assert.equal(publicMenu.data.items[0].price, 95)
  assert.equal(publicMenu.data.items[0].isSoldOut, true)

  const before = publicMenu.data
  const bad = await api.request('/api/admin/import/apply', { ...auth, method: 'POST', revision: 2, body: { confirmReplace: true, backup: { ...backup, schemaVersion: 2 } } })
  assert.equal(bad.response.status, 400)
  assert.deepEqual((await api.request('/api/menu')).data, before)
})

test('photo uploads require authentication and validate the actual image content', async (t) => {
  const api = await withApi(t, { imageStore })
  const jpeg = jpegFixture()
  const unauthenticated = await api.raw('/api/admin/images', { body: jpeg, contentType: 'image/jpeg' })
  assert.equal(unauthenticated.response.status, 401)
  const login = await api.request('/api/admin/login', { method: 'POST', body: { password: 'correct horse battery staple' } })
  const auth = { cookie: login.cookie, csrf: login.data.csrfToken }
  const invalid = await api.raw('/api/admin/images', { ...auth, body: Buffer.from('not an image'), contentType: 'image/jpeg' })
  assert.equal(invalid.response.status, 400)
  const unsupported = await api.raw('/api/admin/images', { ...auth, body: jpeg, contentType: 'image/gif' })
  assert.equal(unsupported.response.status, 415)
  const oversized = await api.raw('/api/admin/images', { ...auth, body: Buffer.alloc(5 * 1024 * 1024 + 1), contentType: 'image/jpeg' })
  assert.equal(oversized.response.status, 413)
})

test('configured admin sessions receive an honest storage error when R2 is unavailable', async (t) => {
  const api = await withApi(t)
  const login = await api.request('/api/admin/login', { method: 'POST', body: { password: 'correct horse battery staple' } })
  const result = await api.raw('/api/admin/images', { cookie: login.cookie, csrf: login.data.csrfToken, body: jpegFixture(), contentType: 'image/jpeg' })
  assert.equal(result.response.status, 503)
  assert.match(result.data.error, /Photo storage is not configured/)
})

test('photo uploads persist references, item updates preserve fields, and removal protects shared photos', async (t) => {
  imageStore.files.clear()
  const api = await withApi(t, { imageStore })
  const login = await api.request('/api/admin/login', { method: 'POST', body: { password: 'correct horse battery staple' } })
  const auth = { cookie: login.cookie, csrf: login.data.csrfToken }
  const uploaded = await api.raw('/api/admin/images', { ...auth, body: jpegFixture(), contentType: 'image/jpeg' })
  assert.equal(uploaded.response.status, 201)
  const photo = { ...uploaded.data.image, alt: 'Latte' }
  const saved = await api.request('/api/admin/menu/latte', { ...auth, method: 'PUT', revision: 1, body: { ...latte, image: photo } })
  assert.equal(saved.response.status, 200)
  const withPhoto = (await api.request('/api/menu')).data.items[0]
  assert.equal(withPhoto.image.src, photo.src)
  assert.equal(withPhoto.price, latte.price)
  assert.equal(withPhoto.category, latte.category)
  assert.equal(withPhoto.description, latte.description)
  const stalePhotoRemoval = await api.request('/api/admin/menu/latte', { ...auth, method: 'PUT', revision: 1, body: latte })
  assert.equal(stalePhotoRemoval.response.status, 409)
  assert.equal(imageStore.files.has(photo.src), true)

  const secondItem = { ...latte, id: 'latte-special', name: 'Latte Special', image: photo }
  await api.request('/api/admin/menu', { ...auth, method: 'POST', revision: 2, body: secondItem })
  const removeInUse = await api.request('/api/admin/images', { ...auth, method: 'DELETE', body: { src: photo.src } })
  assert.equal(removeInUse.response.status, 409)

  const reopened = await api.request('/api/menu')
  assert.equal(reopened.data.items.length, 2)
  assert.equal(reopened.data.items.every((item) => item.image?.src === photo.src), true)
  const removeSecond = await api.request('/api/admin/menu/latte-special', { ...auth, method: 'DELETE', revision: 3 })
  assert.equal(removeSecond.response.status, 200)
  assert.equal(imageStore.files.has(photo.src), true)
  const clearFirst = await api.request('/api/admin/menu/latte', { ...auth, method: 'PUT', revision: 4, body: latte })
  assert.equal(clearFirst.response.status, 200)
  assert.equal(imageStore.files.has(photo.src), false)
})
