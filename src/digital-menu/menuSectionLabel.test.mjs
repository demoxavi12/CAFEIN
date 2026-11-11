import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getMenuSectionLabel } from './menuSectionLabel.mjs'

test('Pastas receives the requested display label without changing other menu sections', () => {
  assert.equal(getMenuSectionLabel('Pastas'), 'Pastas & Spaghettis')
  assert.equal(getMenuSectionLabel('Essence of Espresso'), 'Essence of Espresso')
  assert.equal(getMenuSectionLabel('Chilled Chronicles'), 'Chilled Chronicles')
})

test('category navigation keeps section identifiers stable while displaying the editorial label', async () => {
  const [categoryMenu, styles] = await Promise.all([
    readFile(new URL('./CategoryMenu.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./digital-menu-theme.css', import.meta.url), 'utf8'),
  ])
  assert.match(categoryMenu, /id: getSubcategoryId\(category\.id, label\)/)
  assert.match(categoryMenu, /label: getMenuSectionLabel\(label\)/)
  assert.match(categoryMenu, /digital-menu-subcategory__heading/)
  assert.match(styles, /\.digital-menu-subcategory__heading h3::before/)
  assert.match(styles, /\.digital-menu-subcategory__heading h3::after/)
})
