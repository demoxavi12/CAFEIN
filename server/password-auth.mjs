import { compare as compareBcrypt } from 'bcryptjs'

const BCRYPT_HASH = /^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/

export function hasManagerPasswordConfig(env = process.env) {
  return BCRYPT_HASH.test(String(env.MANAGER_PASSWORD_HASH || ''))
}

export async function verifyManagerPassword(password, env = process.env) {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 256) return false

  const managerHash = String(env.MANAGER_PASSWORD_HASH || '')
  if (!BCRYPT_HASH.test(managerHash) || Buffer.byteLength(password, 'utf8') > 72) return false
  try {
    return await compareBcrypt(password, managerHash)
  } catch {
    return false
  }
}
