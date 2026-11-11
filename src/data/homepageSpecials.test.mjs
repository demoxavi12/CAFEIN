import test from 'node:test'
import assert from 'node:assert/strict'
import { homepageSpecials, resolveHomepageSpecials } from './homepageSpecials.mjs'

const expected = [
  ['cappuccino', 'cappuccino'],
  ['classic-coffee-frappe', 'classic-coffee-frappe'],
  ['iced-americano', 'iced-americano'],
  ['strawberry-matcha', 'strawberry-matcha'],
  ['floating-peach', 'floating-peach'],
  ['brownie-frappe', 'brownie-frappe'],
  ['caesar-salad', 'caesar-salad'],
  ['blueberry-cheesecake', 'blueberry-cheesecake'],
  ['paneer-subway', 'subway-paneer'],
  ['aglio-olio-spaghetti', 'aglio-olio-spaghetti'],
]

test('homepage selection preserves all ten keys and menu IDs in approved order', () => {
  assert.deepEqual(homepageSpecials.map(({ key, menuItemId }) => [key, menuItemId]), expected)
})

test('homepage cards resolve all product fields directly from menu records', () => {
  const records = expected.map(([, id], index) => ({
    id,
    name: `Menu name ${index}`,
    price: 100 + index,
    description: `Menu description ${index}`,
    image: { src: `/menu/${id}.webp`, alt: `Menu image ${index}` },
    badge: index % 2 ? 'Chef Special' : 'Bestseller',
    isSoldOut: index === 4,
    section: `Section ${index}`,
  }))

  const cards = resolveHomepageSpecials(records)
  assert.equal(cards.length, 10)
  assert.deepEqual(cards.map(({ id }) => id), expected.map(([key]) => key))
  assert.deepEqual(cards.map(({ menuItem }) => menuItem.id), expected.map(([, id]) => id))
  assert.equal(cards[0].menuItem.name, 'Menu name 0')
  assert.equal(cards[0].menuItem.price, 100)
  assert.equal(cards[0].menuItem.description, 'Menu description 0')
  assert.deepEqual(cards[0].menuItem.image, { src: '/menu/cappuccino.webp', alt: 'Menu image 0' })
  assert.equal(cards[0].menuItem.badge, 'Bestseller')
  assert.equal(cards[4].menuItem.isSoldOut, true)

  const updated = {
    ...records[0],
    name: 'Updated menu name',
    price: 275,
    description: 'Updated menu description',
    image: { src: '/menu/updated.webp', alt: 'Updated menu photo' },
    badge: 'Chef Special',
    isSoldOut: true,
  }
  assert.deepEqual(resolveHomepageSpecials([updated])[0].menuItem, updated)
})

test('missing and archived products are skipped and duplicate menu IDs are not repeated', () => {
  const records = [
    { id: 'cappuccino', name: 'Cappuccino', price: 80 },
    { id: 'cappuccino', name: 'Duplicate', price: 1 },
    { id: 'classic-coffee-frappe', name: 'Archived', isArchived: true },
  ]
  assert.deepEqual(resolveHomepageSpecials(records), [{ id: 'cappuccino', menuItem: records[0] }])
})
