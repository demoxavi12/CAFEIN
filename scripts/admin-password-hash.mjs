import { randomBytes } from 'node:crypto'
import { stdout } from 'node:process'
import { makePasswordHash } from '../server/api.mjs'

const password = randomBytes(32).toString('base64url')
const passwordHash = await makePasswordHash(password)
stdout.write('Store this one-time manager password in your password manager, then set its hash in the server secret manager.\n')
stdout.write(`Manager password (shown once): ${password}\n`)
stdout.write(`ADMIN_PASSWORD_HASH: ${passwordHash}\n`)
