import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadSeedMenu } from '../server/seed.mjs'

const root = process.cwd()
const output = path.join(root, 'dist', 'menu-seed.json')
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, JSON.stringify(loadSeedMenu(root), null, 2), { encoding: 'utf8', mode: 0o644 })
