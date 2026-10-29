import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadSourceData, assertSourceData } from './source-data.mjs'

const data = await loadSourceData()
assertSourceData(data)
const now = new Date()
const stamp = now.toISOString().replaceAll(':', '-').replaceAll('.', '-')
const backupDirectory = path.join(data.root, 'data', 'backups')
const backupPath = path.join(backupDirectory, `sanity-migration-${stamp}.json`)
const specialEntries = [
  ...data.specials.ids.map((id) => ({ id, kind: 'menuItemReference', order: undefined })),
  ...data.specialItems.filter((item) => item.id.startsWith('temp-')).map((item) => ({ kind: 'temporaryContent', ...item })),
]
specialEntries.forEach((entry, order) => { entry.order = order })

await mkdir(backupDirectory, { recursive: true })
await writeFile(backupPath, JSON.stringify({
  backupCreatedAt: now.toISOString(),
  source: 'data/menu-store.json (live authoritative store)',
  menuStore: data.store,
  signatureSpecials: { ...data.specials, entries: specialEntries },
}, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 })

console.log(`Backup created: ${path.relative(data.root, backupPath)}`)
console.log(`Categories: ${data.store.categories.length}; live menu items: ${data.store.items.length}; real special references: ${data.specials.ids.length}; temporary special cards: ${specialEntries.filter((entry) => entry.kind === 'temporaryContent').length}`)
