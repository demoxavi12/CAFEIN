import test from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { hasManagerPasswordConfig, verifyManagerPassword } from './password-auth.mjs'

const syntheticPassword = 'synthetic manager test password'

test('bcrypt manager password hashes accept only the matching password', async () => {
  const hash = await bcrypt.hash(syntheticPassword, 4)
  assert.equal(await verifyManagerPassword(syntheticPassword, { MANAGER_PASSWORD_HASH: hash }), true)
  assert.equal(await verifyManagerPassword('different synthetic password', { MANAGER_PASSWORD_HASH: hash }), false)
  assert.equal(await verifyManagerPassword('é'.repeat(37), { MANAGER_PASSWORD_HASH: hash }), false)
})

test('manager authentication configuration fails closed when the bcrypt hash is missing or invalid', async () => {
  assert.equal(hasManagerPasswordConfig({}), false)
  assert.equal(await verifyManagerPassword(syntheticPassword, {}), false)
  assert.equal(hasManagerPasswordConfig({ MANAGER_PASSWORD_HASH: '$bad$' }), false)
  assert.equal(await verifyManagerPassword(syntheticPassword, { MANAGER_PASSWORD_HASH: '$bad$' }), false)
})
