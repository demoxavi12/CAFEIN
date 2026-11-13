import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { discoverNumberedGalleryWebp, readWebpDimensions } from './scripts/gallery-assets.mjs'
import { createApiHandler } from './server/api.mjs'
import { loadSeedMenu } from './server/seed.mjs'
import { createSanityDraftPreviewHandler } from './server/sanity-preview.mjs'

function menuApi() {
  return {
    name: 'cafe-in-menu-api',
    configureServer(server: ViteDevServer) {
      const handler = createApiHandler({
        seed: loadSeedMenu(process.cwd()),
        filePath: path.resolve(process.env.MENU_STORE_PATH || path.join(process.cwd(), 'data', 'menu-store.json')),
      })
      server.middlewares.use(handler)
    },
  }
}

function localSanityDraftPreview() {
  return {
    name: 'cafe-in-local-sanity-draft-preview',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(createSanityDraftPreviewHandler())
    },
  }
}

const galleryVirtualId = 'virtual:cafe-in-gallery-assets'
const resolvedGalleryVirtualId = `\0${galleryVirtualId}`

function galleryAssets() {
  const galleryDirectory = path.resolve(process.cwd(), 'public', 'images', 'gallery')

  return {
    name: 'cafe-in-numbered-gallery-assets',
    resolveId(id: string) {
      return id === galleryVirtualId ? resolvedGalleryVirtualId : null
    },
    load(id: string) {
      if (id !== resolvedGalleryVirtualId) return null

      const assets = discoverNumberedGalleryWebp(galleryDirectory).map((filename) => {
        const number = Number(path.parse(filename).name)
        const dimensions = readWebpDimensions(path.join(galleryDirectory, filename))
        return {
          number,
          filename,
          src: `/images/gallery/${filename}`,
          ...dimensions,
        }
      })

      return `export const numberedGalleryAssets = ${JSON.stringify(assets)};`
    },
    configureServer(server: ViteDevServer) {
      server.watcher.add(galleryDirectory)
      const reloadGallery = (changedPath: string) => {
        if (
          path.dirname(path.resolve(changedPath)) !== galleryDirectory ||
          !/^\d+\.webp$/i.test(path.basename(changedPath))
        ) return

        const module = server.moduleGraph.getModuleById(resolvedGalleryVirtualId)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('add', reloadGallery)
      server.watcher.on('unlink', reloadGallery)
      return () => {
        server.watcher.off('add', reloadGallery)
        server.watcher.off('unlink', reloadGallery)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), galleryAssets(), localSanityDraftPreview(), menuApi()],
})
