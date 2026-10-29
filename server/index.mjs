import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApiHandler } from './api.mjs'
import { readBuiltSeed } from './seed.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const storeFile = path.resolve(process.env.MENU_STORE_PATH || path.join(root, 'data', 'menu-store.json'))
const api = createApiHandler({ seed: await readBuiltSeed(root), filePath: storeFile })
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
}

async function serveStatic(req, res) {
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname)
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    const filename = path.resolve(dist, relative)
    if (!filename.startsWith(`${dist}${path.sep}`) && filename !== path.join(dist, 'index.html')) {
      res.writeHead(400).end()
      return
    }
    let target = filename
    try {
      if (!(await stat(target)).isFile()) target = path.join(dist, 'index.html')
    } catch {
      target = path.join(dist, 'index.html')
    }
    const contents = await readFile(target)
    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
    })
    res.end(contents)
  } catch {
    res.writeHead(400).end()
  }
}

const server = createServer((req, res) => {
  api(req, res, () => void serveStatic(req, res))
})
const port = Number(process.env.PORT || 4173)
server.listen(port, process.env.HOST || '0.0.0.0', () => {
  process.stdout.write(`Cafe In server listening on port ${port}\n`)
})
