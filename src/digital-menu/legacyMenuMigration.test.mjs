import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LEGACY_MENU_OVERRIDES_KEY,
  inspectLegacyMenuOverrides,
  buildLegacyRecoveryBackup,
  buildLegacyRecoveryItems,
  removeLegacyOverrideRecords,
  discardMalformedLegacyOverride,
  convertLegacyMenuOverrides,
} from './legacyMenuMigration.mjs'

const categories = [{ id: 'beverages', label: 'Beverages', short: 'Coffee', blurb: 'Coffee' }]
const snapshot = {
  revision: 9,
  categories,
  items: [
    { id: 'latte', name: 'Latte', price: 80, category: 'beverages', section: 'Coffee', description: 'Milk coffee', isSoldOut: false, badge: 'Bestseller' },
    { id: 'archived-cake', name: 'Archived Cake', price: 90, category: 'beverages', section: 'Desserts', description: 'Cake', isSoldOut: false, isArchived: true },
  ],
}

test('legacy recovery separates valid changes from obsolete, invalid, malformed, and archived records', () => {
  const result = inspectLegacyMenuOverrides(JSON.stringify({
    prices: { latte: 95, 'pesto-spaghetti': 'bad', 'archived-cake': 110, 'bad_id': 25 },
    descriptions: { latte: 'Saved description' },
    badges: { latte: 'chef-special' },
    soldOut: { latte: true },
    invalidField: { latte: 'ignored only after explicit review' },
  }), snapshot)
  assert.equal(result.total, 8)
  assert.equal(result.records.filter(({ status }) => status === 'valid').length, 4)
  assert.equal(result.records.find(({ id }) => id === 'pesto-spaghetti').status, 'obsolete')
  assert.equal(result.records.find(({ id }) => id === 'archived-cake').status, 'archived')
  assert.equal(result.records.find(({ id }) => id === 'bad_id').status, 'invalid')
  assert.equal(result.malformed.length, 1)
})

test('an obsolete invalid value does not block valid edits for current items', () => {
  const result = inspectLegacyMenuOverrides(JSON.stringify({ prices: { latte: 95, 'pesto-spaghetti': -1 } }), snapshot)
  const selected = result.records.filter(({ status }) => status === 'valid').map(({ key }) => key)
  const backup = buildLegacyRecoveryBackup(snapshot, result, selected)
  assert.equal(backup.items.find(({ id }) => id === 'latte').price, 95)
  assert.equal(backup.items.some(({ id }) => id === 'pesto-spaghetti'), false)
  assert.equal(backup.items.find(({ id }) => id === 'archived-cake').isArchived, true)
  assert.deepEqual(buildLegacyRecoveryItems(snapshot, result, selected).map(({ id, price }) => ({ id, price })), [{ id: 'latte', price: 95 }])
})

test('empty and malformed recovery records remain reviewable without data loss', () => {
  const empty = inspectLegacyMenuOverrides('{}', snapshot)
  assert.equal(empty.total, 0)
  assert.equal(convertLegacyMenuOverrides('{}', snapshot).items.length, snapshot.items.length)
  assert.equal(inspectLegacyMenuOverrides('{broken', snapshot).malformed[0].key, 'malformed:json')
  assert.equal(inspectLegacyMenuOverrides(JSON.stringify({ prices: [] }), snapshot).malformed[0].field, 'Price')
})

test('successful recovery cleanup removes only selected records and retains unsynchronized edits', () => {
  const original = globalThis.localStorage
  const values = new Map([[LEGACY_MENU_OVERRIDES_KEY, JSON.stringify({ prices: { latte: 95, 'pesto-spaghetti': 50 }, descriptions: { latte: 'Keep me' } })]])
  globalThis.localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, value) },
    removeItem(key) { values.delete(key) },
  }
  try {
    assert.equal(removeLegacyOverrideRecords([{ field: 'prices', id: 'latte' }]), true)
    const remaining = JSON.parse(values.get(LEGACY_MENU_OVERRIDES_KEY))
    assert.deepEqual(remaining.prices, { 'pesto-spaghetti': 50 })
    assert.deepEqual(remaining.descriptions, { latte: 'Keep me' })
  } finally {
    if (original === undefined) delete globalThis.localStorage
    else globalThis.localStorage = original
  }
})

test('recovery cleanup keeps a browser value that changed after synchronization began', () => {
  const original = globalThis.localStorage
  const values = new Map([[LEGACY_MENU_OVERRIDES_KEY, JSON.stringify({ prices: { latte: 110 } })]])
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
  try {
    assert.equal(removeLegacyOverrideRecords([{ field: 'prices', id: 'latte', value: 95 }], { onlyIfUnchanged: true }), false)
    assert.equal(JSON.parse(values.get(LEGACY_MENU_OVERRIDES_KEY)).prices.latte, 110)
  } finally {
    if (original === undefined) delete globalThis.localStorage
    else globalThis.localStorage = original
  }
})

test('unsuccessful synchronization does not clear saved records', () => {
  const original = globalThis.localStorage
  const raw = JSON.stringify({ prices: { latte: 95 } })
  const values = new Map([[LEGACY_MENU_OVERRIDES_KEY, raw]])
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
  try {
    inspectLegacyMenuOverrides(values.get(LEGACY_MENU_OVERRIDES_KEY), snapshot)
    assert.equal(values.get(LEGACY_MENU_OVERRIDES_KEY), raw)
  } finally {
    if (original === undefined) delete globalThis.localStorage
    else globalThis.localStorage = original
  }
})

test('discarding one malformed field preserves other recoverable browser edits', () => {
  const original = globalThis.localStorage
  const values = new Map([[LEGACY_MENU_OVERRIDES_KEY, JSON.stringify({ prices: [], badges: { latte: 'Bestseller' } })]])
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
  try {
    const issue = inspectLegacyMenuOverrides(values.get(LEGACY_MENU_OVERRIDES_KEY), snapshot).malformed[0]
    assert.equal(discardMalformedLegacyOverride(issue), true)
    assert.deepEqual(JSON.parse(values.get(LEGACY_MENU_OVERRIDES_KEY)), { badges: { latte: 'Bestseller' } })
  } finally {
    if (original === undefined) delete globalThis.localStorage
    else globalThis.localStorage = original
  }
})
