import test from 'node:test'
import assert from 'node:assert/strict'
import { filterArchivedSpecialEntries } from './specialVisibility.mjs'

test('archived real menu items are omitted from specials while temporary entries remain', () => {
  const entries = [
    { id: 'real-active', menuItem: { id: 'latte' } },
    { id: 'real-archived', menuItem: { id: 'cake' } },
    { id: 'temporary', temporaryContent: { id: 'temp-drink' } },
  ]
  assert.deepEqual(filterArchivedSpecialEntries(entries, new Set(['latte'])), [entries[0], entries[2]])
})
