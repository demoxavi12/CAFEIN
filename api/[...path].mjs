import { readBuiltSeed } from '../server/seed.mjs'
import { createSanityApiHandler, createSanityWriteClient } from '../server/sanity-api.mjs'

const env = process.env
const seed = await readBuiltSeed(process.cwd())
const handler = createSanityApiHandler({
  env,
  writeClient: createSanityWriteClient(env),
  seed,
})

export const config = { api: { bodyParser: false } }

export default function api(request, response) {
  return handler(request, response)
}
