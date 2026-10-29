import test from 'node:test'
import assert from 'node:assert/strict'
import { createR2ImageStore, inspectMenuImage, MAX_MENU_IMAGE_BYTES } from './r2-images.mjs'

const jpegFixture = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x02, 0x00, 0x02, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0x00, 0x00, 0xff, 0xd9])

test('image inspection checks MIME, file signature, dimensions, and size', () => {
  assert.deepEqual(inspectMenuImage(jpegFixture, 'image/jpeg'), { width: 2, height: 2, extension: 'jpg' })
  assert.throws(() => inspectMenuImage(jpegFixture, 'image/png'), /valid PNG/)
  assert.throws(() => inspectMenuImage(Buffer.from('invalid image'), 'image/jpeg'), /incomplete/)
  assert.throws(() => inspectMenuImage(Buffer.alloc(MAX_MENU_IMAGE_BYTES + 1), 'image/jpeg'), /smaller than 5 MB/)
})

test('R2 store keeps credentials server-side and signs object writes and deletes', async () => {
  const calls = []
  const env = {
    R2_ACCOUNT_ID: '1234567890abcdef1234567890abcdef',
    R2_ACCESS_KEY_ID: 'ACCESSKEYEXAMPLE',
    R2_SECRET_ACCESS_KEY: 'server-only-secret',
    R2_BUCKET: 'cafe-menu',
    R2_PUBLIC_URL: 'https://images.example',
  }
  const store = createR2ImageStore(env, async (url, options) => {
    calls.push({ url: String(url), ...options })
    return { ok: true }
  })
  const saved = await store.put(jpegFixture, 'image/jpeg', 'jpg')
  assert.equal(saved.src.startsWith('https://images.example/menu/'), true)
  assert.equal(calls[0].method, 'PUT')
  assert.match(calls[0].headers.Authorization, /^AWS4-HMAC-SHA256 /)
  assert.equal(calls[0].headers['content-type'], 'image/jpeg')
  assert.equal(calls[0].url.includes('/cafe-menu/menu/'), true)
  assert.equal(await store.deletePublicUrl(saved.src), true)
  assert.equal(calls[1].method, 'DELETE')
  assert.equal(JSON.stringify(calls).includes(env.R2_SECRET_ACCESS_KEY), false)
})

test('R2 storage stays unavailable until all server configuration is present', async () => {
  const store = createR2ImageStore({})
  assert.equal(store.configured, false)
  await assert.rejects(store.put(jpegFixture, 'image/jpeg', 'jpg'), /not configured/)
})
