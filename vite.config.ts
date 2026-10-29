import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { createApiHandler } from './server/api.mjs'
import { loadSeedMenu } from './server/seed.mjs'

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

export default defineConfig({
  plugins: [react(), tailwindcss(), menuApi()],
})
