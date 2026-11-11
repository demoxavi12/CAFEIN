/** Homepage presentation keys map to stable IDs from the in-café menu. */
export const homepageSpecials = Object.freeze([
  { key: 'cappuccino', menuItemId: 'cappuccino' },
  { key: 'classic-coffee-frappe', menuItemId: 'classic-coffee-frappe' },
  { key: 'iced-americano', menuItemId: 'iced-americano' },
  { key: 'strawberry-matcha', menuItemId: 'strawberry-matcha' },
  { key: 'floating-peach', menuItemId: 'floating-peach' },
  { key: 'brownie-frappe', menuItemId: 'brownie-frappe' },
  { key: 'caesar-salad', menuItemId: 'caesar-salad' },
  { key: 'blueberry-cheesecake', menuItemId: 'blueberry-cheesecake' },
  { key: 'paneer-subway', menuItemId: 'subway-paneer' },
  { key: 'aglio-olio-spaghetti', menuItemId: 'aglio-olio-spaghetti' },
])

/** Missing/archived menu records are omitted without breaking the carousel. */
export function resolveHomepageSpecials(items) {
  const itemsById = new Map()
  for (const item of items) {
    if (item && typeof item.id === 'string' && !item.isArchived && !itemsById.has(item.id)) {
      itemsById.set(item.id, item)
    }
  }

  return homepageSpecials.flatMap(({ key, menuItemId }) => {
    const menuItem = itemsById.get(menuItemId)
    return menuItem ? [{ id: key, menuItem }] : []
  })
}
