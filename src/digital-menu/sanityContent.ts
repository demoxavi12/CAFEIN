import { createClient } from '@sanity/client'
import { createImageUrlBuilder } from '@sanity/image-url'
import type { ImageAsset } from '../data/images'
import type { MenuCategory, MenuItem, CategoryId } from '../data/menu'
import { specials as fallbackSpecials, temporaryItems } from '../data/specials'
import type { EnhancedMenuItem, MenuSnapshot } from './adminStore'
import { filterArchivedSpecialEntries } from './specialVisibility.mjs'

const client = createClient({
  projectId: 'kgt3bhzl',
  dataset: 'production',
  apiVersion: '2025-02-19',
  perspective: 'published',
  useCdn: true,
})
const imageBuilder = createImageUrlBuilder(client)

interface SanityImage {
  asset?: { _ref?: string }
  alt?: string
  objectPosition?: string
  width?: number
  height?: number
  hotspot?: unknown
  crop?: unknown
}

interface SanityItem extends Omit<MenuItem, 'category' | 'image'> {
  category?: string
  categoryId?: string
  image?: SanityImage
  isSoldOut?: boolean
  badge?: string
  isArchived?: boolean
  _updatedAt?: string
}

const imageProjection = `image{asset,hotspot,crop,alt,objectPosition,"width":asset->metadata.dimensions.width,"height":asset->metadata.dimensions.height}`
const menuItemProjection = `id,name,price,"categoryId":category->id,section,description,${imageProjection},needsConfirmation,isSoldOut,isArchived,badge,_updatedAt`

function mapImage(image?: SanityImage): ImageAsset | undefined {
  if (!image?.asset?._ref) return undefined
  return {
    src: imageBuilder.image(image).auto('format').fit('max').url(),
    alt: image.alt || '',
    width: image.width || 900,
    height: image.height || 900,
    ...(image.objectPosition ? { focus: image.objectPosition } : {}),
  }
}

function mapItem(item: SanityItem): EnhancedMenuItem {
  if (!item.id || !item.name || !Number.isInteger(item.price) || !item.categoryId || !item.section) {
    throw new Error(`Published menu item ${item.id || '(missing ID)'} has incomplete required content.`)
  }
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.categoryId as CategoryId,
    section: item.section,
    ...(item.description ? { description: item.description } : {}),
    ...(mapImage(item.image) ? { image: mapImage(item.image) } : {}),
    ...(item.needsConfirmation ? { needsConfirmation: item.needsConfirmation } : {}),
    isSoldOut: Boolean(item.isSoldOut),
    isArchived: Boolean(item.isArchived),
    ...(item.badge ? { badge: item.badge } : {}),
  }
}

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

export interface PublishedSpecials {
  eyebrow: string
  title: string
  items: MenuItem[]
}

interface SanitySpecialEntry {
  id: string
  order: number
  menuItem?: SanityItem
  temporaryContent?: SanityItem
}

export async function fetchPublishedSpecials(): Promise<PublishedSpecials | null> {
  const menuResponse = await fetch('/api/menu', { headers: { Accept: 'application/json' } })
  if (!menuResponse.ok) throw new Error('The active menu could not be checked before loading featured items.')
  const publicMenu = await menuResponse.json() as { items?: Array<{ id?: string }> }
  const activeMenuIds = new Set((publicMenu.items || []).map((item) => item.id).filter((id): id is string => typeof id === 'string'))
  const special = await client.fetch<{
    eyebrow: string
    title: string
    items: SanitySpecialEntry[]
  } | null>(`*[_type == "special" && _id == "special-signature-specials"][0]{eyebrow,title,items[]{id,order,"menuItem":menuItem->{${menuItemProjection}},"temporaryContent":temporaryContent{...,"categoryId":category->id,${imageProjection}}}}`)
  if (!special) return null
  const expectedEntries = fallbackSpecials.ids.length + temporaryItems.length
  if (!Array.isArray(special.items) || special.items.length !== expectedEntries) throw new Error('Published Signature Specials are incomplete; the existing selection remains active.')
  const realReferences = special.items.filter((entry) => Boolean(entry.menuItem))
  const temporaryEntries = special.items.filter((entry) => Boolean(entry.temporaryContent))
  const realIds = new Set(realReferences.map((entry) => entry.menuItem?.id))
  if (realReferences.length !== fallbackSpecials.ids.length || temporaryEntries.length !== temporaryItems.length || fallbackSpecials.ids.some((id) => !realIds.has(id))) {
    throw new Error('Published Signature Specials do not match the approved reference and temporary-entry split.')
  }
  const visibleEntries = filterArchivedSpecialEntries(special.items || [], activeMenuIds)
  const items = [...visibleEntries].sort((a, b) => a.order - b.order).flatMap((entry) => {
    const source = entry.menuItem || entry.temporaryContent
    if (!source) throw new Error(`Published Signature Special ${entry.id} has no valid content.`)
    return [mapItem(source)]
  })
  return { eyebrow: special.eyebrow, title: special.title, items }
}
