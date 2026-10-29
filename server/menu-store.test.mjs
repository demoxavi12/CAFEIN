import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMenuStore, MenuStoreError, validateBackup, validateItems } from './menu-store.mjs'

const categories = [{ id: 'beverages', label: 'Beverages', short: 'Coffee', blurb: 'Coffee and more.' }]
const item = { id: 'latte', name: 'Latte', price: 80, category: 'beverages', section: 'Coffee', description: 'Milk and espresso.', isSoldOut: false, badge: 'Bestseller' }
const seed = { categories, items: [item] }

test('menu updates persist and stale revisions cannot overwrite newer data', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cafein-menu-'))
  const filePath = path.join(dir, 'store.json')
  try {
    const store = createMenuStore({ filePath, seed })
    const first = await store.get()
    const saved = await store.replace([{ ...item, price: 95, isSoldOut: true, badge: 'Chef Special' }], first.revision)
    assert.equal(saved.items[0].price, 95)
    assert.equal(saved.items[0].isSoldOut, true)
    assert.equal(saved.items[0].badge, 'Chef Special')
    await assert.rejects(store.replace([item], first.revision), (error) => error instanceof MenuStoreError && error.status === 409)
    const reopened = createMenuStore({ filePath, seed: { ...seed, items: [{ ...item, price: 999 }] } })
    assert.equal((await reopened.get()).items[0].price, 95)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('item validation rejects duplicate IDs, unsupported categories, and invalid prices', () => {
  assert.throws(() => validateItems([item, item], categories), /Duplicate item ID/)
  assert.throws(() => validateItems([{ ...item, id: 'latte-2', category: 'other' }], categories), /unsupported category/)
  assert.throws(() => validateItems([{ ...item, price: -1 }], categories), /invalid price/)
  assert.throws(() => validateItems([{ ...item, price: 1.5 }], categories), /invalid price/)
})

test('backup validation rejects unknown schema and validates complete data before apply', () => {
  assert.throws(() => validateBackup({ schemaVersion: 2, revision: 1, categories, items: [item] }, categories), /Unsupported backup schema/)
  assert.throws(() => validateBackup({ schemaVersion: 1, revision: 1, categories, items: [item, item] }, categories), /Duplicate item ID/)
  assert.throws(() => validateBackup({ schemaVersion: 1, revision: 1, categories, items: [{ ...item, price: 'free' }] }, categories), /invalid price/)
  assert.equal(validateBackup({ schemaVersion: 1, revision: 1, categories, items: [item] }, categories).items.length, 1)
})

test('image references accept only local assets or configured Cafe In upload URLs', () => {
  const image = { src: 'https://images.example/menu/123e4567-e89b-12d3-a456-426614174000.jpg', alt: 'Latte', width: 800, height: 600 }
  assert.equal(validateItems([{ ...item, image }], categories, 'https://images.example')[0].image.src, image.src)
  assert.throws(() => validateItems([{ ...item, image: { ...image, src: 'https://attacker.example/menu/123e4567-e89b-12d3-a456-426614174000.jpg' } }], categories, 'https://images.example'), /approved Cafe In upload URL/)
  assert.throws(() => validateItems([{ ...item, image: { ...image, src: 'https://images.example/menu/../../private.jpg' } }], categories, 'https://images.example'), /approved Cafe In upload URL/)
})

test('older JSON backups that omit image fields retain current item photos', () => {
  const currentImage = { src: '/images/dish-latte.webp', alt: 'Latte', width: 800, height: 600 }
  const backupItem = { ...item }
  delete backupItem.image
  const backup = { schemaVersion: 1, revision: 1, categories, items: [backupItem] }
  const migrated = validateBackup(backup, categories, { currentItems: [{ ...item, image: currentImage }] })
  assert.deepEqual(migrated.items[0].image, currentImage)
})

test('uploaded image references survive reopening the persistent menu store', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cafein-photo-store-'))
  const filePath = path.join(dir, 'store.json')
  const image = { src: 'https://images.example/menu/123e4567-e89b-12d3-a456-426614174000.png', alt: 'Latte', width: 1200, height: 800 }
  try {
    const store = createMenuStore({ filePath, seed, publicImageBase: 'https://images.example' })
    const initial = await store.get()
    await store.replace([{ ...item, image }], initial.revision)
    const restarted = createMenuStore({ filePath, seed, publicImageBase: 'https://images.example' })
    assert.deepEqual((await restarted.get()).items[0].image, image)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
