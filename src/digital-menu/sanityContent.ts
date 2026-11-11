import type { MenuCategory } from '../data/menu'
import type { EnhancedMenuItem, MenuSnapshot } from './adminStore'

export async function fetchPublishedMenu(): Promise<MenuSnapshot | null> {
  const response = await fetch('/api/menu', { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('The active menu could not be verified by the menu service.')
  const payload = await response.json() as { items?: EnhancedMenuItem[]; categories?: MenuCategory[]; revision?: number }
  const mappedCategories = Array.isArray(payload.categories) ? payload.categories : []
  const mappedItems = Array.isArray(payload.items) ? payload.items.filter((item) => item.id !== 'example' && !item.isArchived) : []
  if (!mappedCategories.length && !mappedItems.length) return null
  if (!mappedCategories.length || !mappedItems.length) throw new Error('The published menu is incomplete; the menu service did not confirm a complete response.')
  const categoryIds = new Set(mappedCategories.map(({ id }) => id))
  const dangling = mappedItems.find((item) => !categoryIds.has(item.category))
  if (dangling) throw new Error(`Menu item ${dangling.id} points to a missing category.`)
  return {
    schemaVersion: 1,
    revision: Number.isInteger(payload.revision) ? payload.revision! : 1,
    categories: mappedCategories,
    items: mappedItems,
  }
}
