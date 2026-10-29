import { readBuiltSeed } from '../server/seed.mjs'
import { createSanityApiHandler, createSanityWriteClient } from '../server/sanity-api.mjs'
import { restoreAdminPath } from '../server/vercel-admin-route.mjs'

const env = process.env
const seed = await readBuiltSeed(process.cwd())
const handler = createSanityApiHandler({
  env,
  writeClient: createSanityWriteClient(env),
  seed,
})

export const config = { api: { bodyParser: false } }

export default function adminApi(request, response) {
  restoreAdminPath(request)
  return handler(request, response)
}
