import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export class MenuStoreError extends Error {
  constructor(message, status = 400, code = 'invalid_request') {
    super(message)
    this.status = status
    this.code = code
  }
}

const allowedBadges = new Set(['', 'Bestseller', 'Chef Special'])
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function validateImage(image, publicImageBase = '') {
  if (image === undefined) return
  if (!image || typeof image !== 'object' || Array.isArray(image)) throw new MenuStoreError('Each image must reference a local asset or an approved uploaded image.')
  if (Object.keys(image).some((key) => !['src', 'alt', 'width', 'height', 'focus'].includes(key))) throw new MenuStoreError('Image contains unsupported fields.')
  const localSource = typeof image.src === 'string' && /^\/images\/[a-zA-Z0-9._/-]+\.(?:webp|jpe?g|png|avif)$/i.test(image.src) && !image.src.includes('..')
  const uploadedSource = publicImageBase && typeof image.src === 'string' && new RegExp(`^${publicImageBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/menu/[0-9a-f-]{36}\\.(?:jpg|png)$`).test(image.src)
  if (!localSource && !uploadedSource) {
    throw new MenuStoreError('Images must use an existing local /images asset path or an approved Cafe In upload URL.')
  }
  if (typeof image.alt !== 'string' || image.alt.length > 300 || !Number.isInteger(image.width) || image.width < 1 || image.width > 10000 || !Number.isInteger(image.height) || image.height < 1 || image.height > 10000) {
    throw new MenuStoreError('Image details are invalid.')
  }
  if (image.focus !== undefined && (typeof image.focus !== 'string' || image.focus.length > 50)) throw new MenuStoreError('Image focus must be a short string.')
}

export function validateItems(items, categories, publicImageBase = '') {
  if (!Array.isArray(items) || items.length > 500) throw new MenuStoreError('Menu items must be an array of at most 500 entries.')
  const categoryIds = new Set(categories.map((category) => category.id))
  const ids = new Set()
  return items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new MenuStoreError('Each menu entry must be an object.')
    if (Object.keys(item).some((key) => !['id', 'name', 'price', 'category', 'section', 'description', 'image', 'needsConfirmation', 'isSoldOut', 'badge'].includes(key))) {
      throw new MenuStoreError('Menu item contains unsupported fields.')
    }
    if (typeof item.id !== 'string' || item.id.length > 80 || !idPattern.test(item.id)) throw new MenuStoreError('Each item needs a lowercase, hyphenated ID.')
    if (ids.has(item.id)) throw new MenuStoreError(`Duplicate item ID: ${item.id}.`)
    ids.add(item.id)
    if (typeof item.name !== 'string' || item.name.trim().length < 1 || item.name.trim().length > 80) throw new MenuStoreError(`Item ${item.id} needs a name of 1–80 characters.`)
    if (!Number.isInteger(item.price) || item.price < 0 || item.price > 100000) throw new MenuStoreError(`Item ${item.id} has an invalid price.`)
    if (!categoryIds.has(item.category)) throw new MenuStoreError(`Item ${item.id} has an unsupported category.`)
    if (typeof item.section !== 'string' || item.section.trim().length < 1 || item.section.length > 80) throw new MenuStoreError(`Item ${item.id} needs a section of 1–80 characters.`)
    if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > 500)) throw new MenuStoreError(`Item ${item.id} has an invalid description.`)
    if (item.needsConfirmation !== undefined && (typeof item.needsConfirmation !== 'string' || item.needsConfirmation.length > 250)) throw new MenuStoreError(`Item ${item.id} has an invalid confirmation note.`)
    if (typeof item.isSoldOut !== 'boolean') throw new MenuStoreError(`Item ${item.id} needs an availability status.`)
    if (item.badge !== undefined && !allowedBadges.has(item.badge)) throw new MenuStoreError(`Item ${item.id} has an unsupported badge.`)
    validateImage(item.image, publicImageBase)
    return {
      id: item.id,
      name: item.name.trim(),
      price: item.price,
      category: item.category,
      section: item.section.trim(),
      ...(item.description === undefined ? {} : { description: item.description.trim() }),
      ...(item.image === undefined ? {} : { image: item.image }),
      ...(item.needsConfirmation === undefined ? {} : { needsConfirmation: item.needsConfirmation }),
      isSoldOut: item.isSoldOut,
      ...(item.badge ? { badge: item.badge } : {}),
    }
  })
}

export function validateCategories(categories, expected) {
  if (!Array.isArray(categories) || categories.length !== expected.length) throw new MenuStoreError('This backup has an incompatible category list.')
  const expectedById = new Map(expected.map((category) => [category.id, category]))
  const result = categories.map((category) => {
    if (!category || Object.keys(category).some((key) => !['id', 'label', 'short', 'blurb'].includes(key))) throw new MenuStoreError('This backup has an incompatible category list.')
    const source = expectedById.get(category?.id)
    if (!source || category.label !== source.label || category.short !== source.short || category.blurb !== source.blurb) {
      throw new MenuStoreError('This backup has an incompatible category list.')
    }
    expectedById.delete(category.id)
    return source
  })
  if (expectedById.size) throw new MenuStoreError('This backup is missing a category.')
  return result
}

export function validateBackup(payload, categories, { publicImageBase = '', currentItems = [] } = {}) {
  if (!payload || typeof payload !== 'object' || payload.schemaVersion !== 1) throw new MenuStoreError('Unsupported backup schema version.')
  if (Object.keys(payload).some((key) => !['schemaVersion', 'revision', 'categories', 'items'].includes(key))) throw new MenuStoreError('Backup contains unsupported fields.')
  if (!Number.isInteger(payload.revision) || payload.revision < 0) throw new MenuStoreError('Backup revision is invalid.')
  const validatedCategories = validateCategories(payload.categories, categories)
  const items = validateItems(payload.items, validatedCategories, publicImageBase)
  const currentById = new Map(currentItems.map((item) => [item.id, item]))
  return {
    categories: validatedCategories,
    items: items.map((item, index) => {
      const sourceItem = payload.items[index]
      const currentImage = currentById.get(item.id)?.image
      return !Object.hasOwn(sourceItem, 'image') && currentImage ? { ...item, image: currentImage } : item
    }),
  }
}

export function createMenuStore({ filePath, seed, publicImageBase = '' }) {
  let snapshotPromise
  let writeChain = Promise.resolve()

  async function load() {
    if (!snapshotPromise) {
      snapshotPromise = (async () => {
        try {
          const saved = JSON.parse(await readFile(filePath, 'utf8'))
          if (saved.schemaVersion !== 1 || !Number.isInteger(saved.revision)) throw new Error('Invalid persisted menu store')
          return { schemaVersion: 1, revision: saved.revision, categories: seed.categories, items: validateItems(saved.items, seed.categories, publicImageBase) }
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error
          const initial = { schemaVersion: 1, revision: 1, categories: seed.categories, items: validateItems(seed.items, seed.categories, publicImageBase) }
          await persist(initial)
          return initial
        }
      })()
    }
    return snapshotPromise
  }

  async function persist(snapshot) {
    await mkdir(path.dirname(filePath), { recursive: true })
    const tempPath = `${filePath}.${randomUUID()}.tmp`
    await writeFile(tempPath, JSON.stringify(snapshot, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    await rename(tempPath, filePath)
  }

  return {
    async get() {
      const snapshot = await load()
      return structuredClone(snapshot)
    },
    async replace(items, expectedRevision) {
      const operation = writeChain.then(async () => {
        const current = await load()
        if (expectedRevision !== current.revision) throw new MenuStoreError('The menu changed in another session. Reload the latest version and try again.', 409, 'revision_conflict')
        const next = { ...current, revision: current.revision + 1, items: validateItems(items, current.categories, publicImageBase) }
        await persist(next)
        snapshotPromise = Promise.resolve(next)
        return structuredClone(next)
      })
      writeChain = operation.catch(() => undefined)
      return operation
    },
  }
}
