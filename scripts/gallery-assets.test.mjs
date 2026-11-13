import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  discoverNumberedGalleryWebp,
  listNumberedGalleryWebp,
  readWebpDimensions,
} from './gallery-assets.mjs'

test('gallery filenames are filtered and sorted numerically without requiring consecutive numbers', () => {
  assert.deepEqual(
    listNumberedGalleryWebp(['12.webp', '2.webp', 'notes.webp', '3.jpeg', '0.webp', '1.WEBP']),
    ['1.WEBP', '2.webp', '12.webp'],
  )
})

test('the supplied gallery WebPs are all discovered in numeric order with valid dimensions', () => {
  const directory = path.resolve('public/images/gallery')
  const assets = discoverNumberedGalleryWebp(directory)
  assert.equal(assets.length, 25)
  assert.deepEqual(assets, [...assets].sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10)))
  for (const filename of assets) {
    const dimensions = readWebpDimensions(path.join(directory, filename))
    assert.ok(dimensions.width > 0)
    assert.ok(dimensions.height > 0)
  }
})

test('gallery discovery tolerates missing directories and ignores nested or non-WebP files', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cafe-gallery-'))
  const directory = path.join(root, 'gallery')
  try {
    assert.deepEqual(discoverNumberedGalleryWebp(directory), [])
    mkdirSync(directory)
    mkdirSync(path.join(directory, 'nested'))
    writeFileSync(path.join(directory, '10.webp'), 'image')
    writeFileSync(path.join(directory, '2.webp'), 'image')
    writeFileSync(path.join(directory, '3.jpeg'), 'image')
    writeFileSync(path.join(directory, 'nested', '1.webp'), 'image')
    assert.deepEqual(discoverNumberedGalleryWebp(directory), ['2.webp', '10.webp'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
