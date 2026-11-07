import { compare as compareBcrypt } from 'bcryptjs'
import { scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const SCRYPT_OPTIONS = { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }
const BCRYPT_HASH = /^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/
const SCRYPT_HASH = /^scrypt\$([a-f0-9]{32,128})\$([a-f0-9]{128})$/i

export function hasManagerPasswordConfig(env = process.env) {
  return Boolean(env.MANAGER_PASSWORD_HASH || env.ADMIN_PASSWORD_HASH)
}

async function verifyScryptPassword(password, encoded) {
  const match = SCRYPT_HASH.exec(String(encoded || ''))
  if (!match) return false
  const actual = await scrypt(password, Buffer.from(match[1], 'hex'), 64, SCRYPT_OPTIONS)
  return timingSafeEqual(actual, Buffer.from(match[2], 'hex'))
}

export async function verifyManagerPassword(password, env = process.env) {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 256) return false

  const modernHash = String(env.MANAGER_PASSWORD_HASH || '')
  if (BCRYPT_HASH.test(modernHash) && Buffer.byteLength(password, 'utf8') <= 72) {
    try {
      if (await compareBcrypt(password, modernHash)) return true
    } catch {
      // Keep the legacy hash available during migration if the new value is invalid.
    }
  }

  const legacyHash = String(env.ADMIN_PASSWORD_HASH || '')
  return legacyHash ? verifyScryptPassword(password, legacyHash) : false
}
