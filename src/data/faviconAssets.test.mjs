import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)

test('favicon, Apple touch icon, and manifest use the circular Cafe In artwork sizes', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8')
  const manifest = JSON.parse(await readFile(new URL('public/site.webmanifest', root), 'utf8'))

  assert.match(html, /rel="icon" type="image\/png" href="\/favicon-16\.png" sizes="16x16"/)
  assert.match(html, /rel="icon" type="image\/png" href="\/favicon-32\.png" sizes="32x32"/)
  assert.match(html, /rel="icon" type="image\/png" href="\/favicon-48\.png" sizes="48x48"/)
  assert.match(html, /rel="icon" type="image\/png" href="\/favicon\.png" sizes="512x512"/)
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180"/)
  assert.match(html, /rel="manifest" href="\/site\.webmanifest"/)
  assert.equal(manifest.background_color, '#F3EBDD')

  const icons = [
    ['public/favicon-16.png', 16],
    ['public/favicon-32.png', 32],
    ['public/favicon-48.png', 48],
    ['public/apple-touch-icon.png', 180],
    ['public/favicon-192.png', 192],
    ['public/favicon.png', 512],
  ]

  for (const [path, size] of icons) {
    const image = await readFile(new URL(path, root))
    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${path} is a PNG`)
    assert.equal(image.readUInt32BE(16), size, `${path} width`)
    assert.equal(image.readUInt32BE(20), size, `${path} height`)
  }

  assert.deepEqual(manifest.icons.map(({ sizes }) => sizes), ['192x192', '512x512'])
})
