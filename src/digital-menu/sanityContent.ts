import { createClient } from '@sanity/client'
import { createImageUrlBuilder } from '@sanity/image-url'
import type { ImageAsset } from '../data/images'
import type { MenuCategory, MenuItem, CategoryId } from '../data/menu'
import { categories as fallbackCategories, menuItems as fallbackItems } from '../data/menu'
import { specials as fallbackSpecials, temporaryItems } from '../data/specials'
import type { EnhancedMenuItem, MenuSnapshot } from './adminStore'

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

interface SanityCategory extends MenuCategory {
  _updatedAt?: string
}

interface SanityItem extends Omit<MenuItem, 'category' | 'image'> {
  category?: string
  categoryId?: string
  image?: SanityImage
  isSoldOut?: boolean
  badge?: string
  _updatedAt?: string
}

const imageProjection = `image{asset,hotspot,crop,alt,objectPosition,"width":asset->metadata.dimensions.width,"height":asset->metadata.dimensions.height}`
const menuItemProjection = `id,name,price,"categoryId":category->id,section,description,${imageProjection},needsConfirmation,isSoldOut,badge,_updatedAt`

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
    ...(item.badge ? { badge: item.badge } : {}),
  }
}

function snapshotRevision(documents: Array<{ _updatedAt?: string }>) {
  return documents.reduce((latest, document) => Math.max(latest, Date.parse(document._updatedAt || '') || 0), 0)
}

export async function fetchPublishedMenu(): Promise<MenuSnapshot | null> {
  const [categories, items] = await Promise.all([
    client.fetch<SanityCategory[]>('*[_type == "menuCategory"] | order(order asc){id,"label":name,short,blurb,order,_updatedAt}'),
    client.fetch<SanityItem[]>(`*[_type == "menuItem" && id != "example"] | order(order asc){${menuItemProjection}}`),
  ])
  if (items.length === 0 && categories.length === 0) return null
  const mappedCategories: MenuCategory[] = categories.map(({ id, label, short, blurb }) => ({ id: id as CategoryId, label, short, blurb }))
  if (!mappedCategories.length || !items.length) throw new Error('Published Sanity menu is incomplete; publish categories and items together.')
  const categoryIds = new Set(mappedCategories.map(({ id }) => id))
  const mappedItems = items.map(mapItem)
  const categorySet = new Set(mappedCategories.map((category) => category.id))
  const itemSet = new Set(mappedItems.map((item) => item.id))
  if (fallbackCategories.some((category) => !categorySet.has(category.id)) || fallbackItems.some((item) => !itemSet.has(item.id))) {
    throw new Error('Published Sanity menu is incomplete; the tracked complete menu remains active.')
  }
  const dangling = mappedItems.find((item) => !categoryIds.has(item.category))
  if (dangling) throw new Error(`Published menu item ${dangling.id} points to an unpublished or missing category.`)
  return {
    schemaVersion: 1,
    revision: snapshotRevision([...categories, ...items]),
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
  const items = [...(special.items || [])].sort((a, b) => a.order - b.order).map((entry) => {
    const source = entry.menuItem || entry.temporaryContent
    if (!source) throw new Error(`Published Signature Special ${entry.id} has no valid content.`)
    return mapItem(source)
  })
  return { eyebrow: special.eyebrow, title: special.title, items }
}
