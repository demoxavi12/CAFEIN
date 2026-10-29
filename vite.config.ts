import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
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

export default defineConfig({
  plugins: [react(), tailwindcss(), localSanityDraftPreview(), menuApi()],
})
