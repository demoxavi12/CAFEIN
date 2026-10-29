import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const bestsellerIds = new Set([
  'cappuccino',
  'biscoff-latte',
  'vietnamese-iced-coffee',
  'loaded-french-fries',
  'alfredo-penne',
  'biscoff-cheesecake',
  'hot-chocolate',
])

function loadTypeScriptModule(filename, cache = new Map()) {
  const ts = require('typescript')
  const absolutePath = path.resolve(filename)
  if (cache.has(absolutePath)) return cache.get(absolutePath)

  const source = require('node:fs').readFileSync(absolutePath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: absolutePath,
  }).outputText
  const module = { exports: {} }
  cache.set(absolutePath, module.exports)
  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      const base = path.resolve(path.dirname(absolutePath), specifier)
      const tsPath = `${base}.ts`
      if (require('node:fs').existsSync(tsPath)) return loadTypeScriptModule(tsPath, cache)
    }
    return createRequire(absolutePath)(specifier)
  }
  new Function('exports', 'require', 'module', compiled)(module.exports, localRequire, module)
  cache.set(absolutePath, module.exports)
  return module.exports
}

export function loadSeedMenu(root = process.cwd()) {
  const source = loadTypeScriptModule(path.join(root, 'src/data/menu.ts'))
  return {
    categories: source.categories,
    items: source.menuItems.map((item) => ({
      ...item,
      isSoldOut: false,
      badge: bestsellerIds.has(item.id) ? 'Bestseller' : undefined,
    })),
  }
}

export async function readBuiltSeed(root = process.cwd()) {
  const seedPath = path.join(root, 'dist/menu-seed.json')
  try {
    return JSON.parse(await readFile(seedPath, 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    return loadSeedMenu(root)
  }
}
