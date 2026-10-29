import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const sectionUrl = new URL('./ReviewsSection.tsx', import.meta.url)
const component = await readFile(sectionUrl, 'utf8')
const homepage = await readFile(new URL('../App.tsx', import.meta.url), 'utf8')
const assetDirectory = new URL('../../public/images/google-reviews/', import.meta.url)

function readJpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null

  let offset = 2
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }

    let marker = buffer[offset + 1]
    offset += 2
    while (marker === 0xff) marker = buffer[offset++]
    if ([0xd8, 0xd9, 0x01].includes(marker) || (marker >= 0xd0 && marker <= 0xd7)) continue

    const segmentLength = buffer.readUInt16BE(offset)
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) }
    }
    offset += segmentLength
  }

  return null
}

test('homepage renders the original Google review screenshot gallery assets', async () => {
  const referencedPaths = [...component.matchAll(/src:\s*'(\/images\/google-reviews\/[^']+)'/g)].map((match) => match[1])
  const expectedPaths = Array.from({ length: 24 }, (_, index) => `/images/google-reviews/review-${String(index + 1).padStart(2, '0')}.jpeg`)
  const directoryFiles = (await readdir(assetDirectory)).sort()

  assert.match(homepage, /<ReviewsSection\s*\/>/)
  assert.deepEqual(referencedPaths, expectedPaths)
  assert.deepEqual(directoryFiles, expectedPaths.map((path) => path.split('/').at(-1)))
  assert.match(component, /loading="lazy"/)
  assert.match(component, /decoding="async"/)
  assert.match(component, /onError=\{\(\) => setFailed\(true\)\}/)

  for (const [index, path] of expectedPaths.entries()) {
    const asset = await readFile(new URL(`../../public${path}`, import.meta.url))
    const dimensions = readJpegDimensions(asset)
    const filename = path.split('/').at(-1).replaceAll('.', '\\.')
    const declared = component.match(new RegExp(`src: '${path.replaceAll('.', '\\.')}', width: (\\d+), height: (\\d+)`))

    assert.ok(dimensions, `${filename} is a valid JPEG`)
    assert.ok(declared, `${filename} has responsive dimensions declared`)
    assert.equal(dimensions.width, Number(declared[1]), `${filename} width matches its declared width`)
    assert.equal(dimensions.height, Number(declared[2]), `${filename} height matches its declared height`)
    assert.equal(index + 1, Number(filename.match(/\d+/)?.[0]), `${filename} sequence is correct`)
  }
})
