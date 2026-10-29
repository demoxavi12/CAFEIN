import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '../..')

async function compileDataModule(sourcePath, outputPath) {
  const source = await readFile(sourcePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replaceAll("from './images'", "from './images.js'").replaceAll("from './menu'", "from './menu.js'")
  await writeFile(outputPath, transpiled, 'utf8')
}

export async function loadSourceData() {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'cafe-in-source-'))
  try {
    await writeFile(path.join(temp, 'package.json'), '{"type":"module"}', 'utf8')
    await Promise.all([
      compileDataModule(path.join(root, 'src/data/images.ts'), path.join(temp, 'images.js')),
      compileDataModule(path.join(root, 'src/data/menu.ts'), path.join(temp, 'menu.js')),
      compileDataModule(path.join(root, 'src/data/specials.ts'), path.join(temp, 'specials.js')),
    ])
    const [menu, specials] = await Promise.all([
      import(pathToFileURL(path.join(temp, 'menu.js')).href),
      import(pathToFileURL(path.join(temp, 'specials.js')).href),
    ])
    const store = JSON.parse(await readFile(path.join(root, 'data/menu-store.json'), 'utf8'))
    return { root, store, seedCategories: menu.categories, seedItems: menu.menuItems, specials: specials.specials, specialItems: specials.featuredItems }
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

export async function loadVerifiedBackupData(data) {
  const backupPath = path.join(data.root, 'data/backups/sanity-migration-2026-10-29T10-12-15-761Z.json')
  const backup = JSON.parse(await readFile(backupPath, 'utf8'))
  if (!backup.backupCreatedAt || backup.source !== 'data/menu-store.json (live authoritative store)') {
    throw new Error('The expected timestamped source backup is missing its provenance metadata.')
  }
  if (JSON.stringify(backup.menuStore) !== JSON.stringify(data.store)) {
    throw new Error('The live JSON store differs from the verified migration backup; stop and reconcile before writing.')
  }
  const entries = backup.signatureSpecials?.entries
  const referenced = entries?.filter((entry) => entry.kind === 'menuItemReference') || []
  const temporary = entries?.filter((entry) => entry.kind === 'temporaryContent') || []
  if (backup.signatureSpecials.eyebrow !== data.specials.eyebrow
    || backup.signatureSpecials.title !== data.specials.title
    || JSON.stringify(backup.signatureSpecials.ids) !== JSON.stringify(data.specials.ids)
    || referenced.length !== 4
    || temporary.length !== 6
    || referenced.some((entry, order) => entry.id !== data.specials.ids[order] || entry.order !== order)) {
    throw new Error('The Signature Specials data in the backup does not match the inventoried four references and six temporary entries.')
  }
  const backupTemporary = temporary.map(({ kind: _kind, order: _order, ...item }) => item)
  const sourceTemporary = data.specialItems.filter((item) => item.id.startsWith('temp-'))
  if (JSON.stringify(backupTemporary) !== JSON.stringify(sourceTemporary)) {
    throw new Error('Temporary special cards in the backup differ from the current source module; reconcile before writing.')
  }
  const verified = {
    ...data,
    store: backup.menuStore,
    specials: {
      eyebrow: backup.signatureSpecials.eyebrow,
      title: backup.signatureSpecials.title,
      ids: backup.signatureSpecials.ids,
    },
    specialItems: [
      ...backup.signatureSpecials.ids.map((id) => backup.menuStore.items.find((item) => item.id === id)),
      ...backupTemporary,
    ],
    backupPath,
  }
  if (verified.specialItems.some((item) => !item)) throw new Error('The source backup has a special reference to a missing menu item.')
  assertSourceData(verified)
  return verified
}

export function assertSourceData(data) {
  const { store } = data
  const ids = store.items.map(({ id }) => id)
  const categoryIds = store.categories.map(({ id }) => id)
  const errors = []
  if (new Set(ids).size !== ids.length) errors.push('Live menu contains duplicate item IDs.')
  if (new Set(categoryIds).size !== categoryIds.length) errors.push('Live menu contains duplicate category IDs.')
  for (const item of store.items) {
    if (!categoryIds.includes(item.category)) errors.push(`Item ${item.id} references missing category ${item.category}.`)
    if (!Number.isInteger(item.price) || item.price < 0 || item.price > 100000) errors.push(`Item ${item.id} has invalid rupee price.`)
    if (item.badge && !['Bestseller', 'Chef Special'].includes(item.badge)) errors.push(`Item ${item.id} has unsupported badge ${item.badge}.`)
  }
  const sourceItemIds = new Set(store.items.map(({ id }) => id))
  for (const id of data.specials.ids) if (!sourceItemIds.has(id)) errors.push(`Special references missing menu item ${id}.`)
  const specialIds = [...data.specials.ids, ...data.specialItems.filter((item) => item.id.startsWith('temp-')).map(({ id }) => id)]
  if (new Set(specialIds).size !== specialIds.length) errors.push('Signature Specials contain duplicate stable keys.')
  if (errors.length) throw new Error(errors.join('\n'))
}
