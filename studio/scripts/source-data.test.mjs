import test from 'node:test'
import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { assertSourceData, loadSourceData, loadVerifiedBackupData } from './source-data.mjs'
import { unpublishedReference } from './migration-reference-strategy.mjs'
import { missingDraftDocuments, planImageAssets } from './migration-resume.mjs'

const data = await loadSourceData()

test('live JSON is the authoritative complete menu source', () => {
  assert.equal(data.store.categories.length, 4)
  assert.equal(data.store.items.length, 60)
  assert.deepEqual(data.store.items.slice(-2).map(({ id }) => id), ['strawberry-matcha', 'example'])
  assertSourceData(data)
})

test('menu IDs, category references, prices, and badges are valid', () => {
  const ids = data.store.items.map(({ id }) => id)
  const categories = new Set(data.store.categories.map(({ id }) => id))
  assert.equal(new Set(ids).size, ids.length)
  for (const item of data.store.items) {
    assert.ok(categories.has(item.category), `${item.id} has a category`)
    assert.ok(Number.isInteger(item.price) && item.price >= 0 && item.price <= 100000, `${item.id} has a whole rupee price`)
    assert.ok(!item.badge || ['Bestseller', 'Chef Special'].includes(item.badge), `${item.id} has an allowed badge`)
  }
})

test('specials preserve four real references and six temporary cards separately', () => {
  assert.equal(data.specials.ids.length, 4)
  assert.equal(data.specialItems.filter(({ id }) => id.startsWith('temp-')).length, 6)
  assert.ok(data.specials.ids.every((id) => data.store.items.some((item) => item.id === id)))
})

test('verified timestamped backup matches the live store and special lineup', async () => {
  const verified = await loadVerifiedBackupData(data)
  assert.equal(verified.store.items.length, 60)
  assert.equal(verified.specials.ids.length, 4)
  assert.equal(verified.specialItems.filter(({ id }) => id.startsWith('temp-')).length, 6)
  assert.ok(verified.backupPath.endsWith('sanity-migration-2026-10-29T10-12-15-761Z.json'))
})

test('unpublished references use stable IDs and strengthen only on publish', () => {
  assert.deepEqual(unpublishedReference('menuCategory-beverages', 'menuCategory'), {
    _type: 'reference',
    _ref: 'menuCategory-beverages',
    _weak: true,
    _strengthenOnPublish: { type: 'menuCategory' },
  })
  assert.throws(() => unpublishedReference('drafts.menuCategory-beverages', 'menuCategory'), /stable published ID/)
})

test('partial migration resumes without recreating deterministic category drafts', () => {
  const planned = [
    { _id: 'drafts.menuCategory-beverages', _type: 'menuCategory' },
    { _id: 'drafts.menuCategory-desserts', _type: 'menuCategory' },
    { _id: 'drafts.menuItem-espresso', _type: 'menuItem' },
  ]
  const afterFailure = new Set(['drafts.menuCategory-beverages', 'drafts.menuCategory-desserts'])
  const resume = missingDraftDocuments(planned, afterFailure)
  assert.deepEqual(resume.map(({ _id }) => _id), ['drafts.menuItem-espresso'])
  assert.deepEqual(missingDraftDocuments(planned, new Set(planned.map(({ _id }) => _id))), [])
})

test('partial image uploads are reused by hash without creating another asset', () => {
  const images = [
    { sourcePath: '/images/a.webp', sha1: 'same-hash' },
    { sourcePath: '/images/b.webp', sha1: 'new-hash' },
  ]
  const plan = planImageAssets(images, [{ _id: 'image-asset-existing', sha1hash: 'same-hash' }])
  assert.equal(plan[0].existingAssetId, 'image-asset-existing')
  assert.equal(plan[1].existingAssetId, undefined)
  assert.equal(plan.filter(({ existingAssetId }) => !existingAssetId).length, 1)
})

test('all distinct menu and special image files exist locally', async () => {
  const images = new Map()
  for (const item of [...data.store.items, ...data.specialItems]) if (item.image?.src) images.set(item.image.src, item.image)
  assert.equal(images.size, 15)
  await Promise.all([...images.keys()].map((src) => access(path.join(data.root, 'public', src.replace(/^\/+/, '')))))
})
