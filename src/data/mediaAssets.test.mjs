import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import test from 'node:test'

const imagesRoot = new URL('../../public/images/', import.meta.url)
const sourceFiles = {
  'IMG_20260805_230254.webp': 'IMG_20260805_230254.jpg.jpeg',
  'Screenshot_20260812_103550.webp': 'Screenshot_20260812_103550.jpg.jpeg',
  'Screenshot_20260830_180733.webp': 'Screenshot_20260830_180733.jpg.jpeg',
  'Screenshot_20260830_180741.webp': 'Screenshot_20260830_180741.jpg.jpeg',
  'Screenshot_20260830_180745.webp': 'Screenshot_20260830_180745.jpg.jpeg',
  'IMG-20260804-WA0026(1).webp': 'IMG-20260804-WA0026(1).jpg.jpeg',
  'IMG_20260809_215809.webp': 'IMG_20260809_215809.jpg.jpeg',
  'IMG_20260813_192951.webp': 'IMG_20260813_192951.jpg.jpeg',
  'IMG_20260905_202926.webp': 'IMG_20260905_202926.jpg.jpeg',
  'IMG_20260906_205200.webp': 'IMG_20260906_205200.jpg.jpeg',
  'IMG_20260928_194712.webp': 'IMG_20260928_194712.jpg.jpeg',
}

test('intro and gallery optimized photo references resolve to WebP assets', async () => {
  const [intro, gallery] = await Promise.all([
    readFile(new URL('../components/IntroAnimation.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./gallery.ts', import.meta.url), 'utf8'),
  ])
  const references = [...`${intro}\n${gallery}`.matchAll(/['"]\/images\/optimized\/([^'"]+\.webp)['"]/g)]
    .map((match) => match[1])

  assert.equal(new Set(references).size, references.length, 'each optimized source is referenced once')
  assert.deepEqual([...references].sort(), Object.keys(sourceFiles).sort())

  let originalBytes = 0
  let optimizedBytes = 0
  for (const [optimizedName, originalName] of Object.entries(sourceFiles)) {
    const [original, optimized] = await Promise.all([
      stat(new URL(originalName, imagesRoot)),
      readFile(new URL(`optimized/${optimizedName}`, imagesRoot)),
    ])

    assert.equal(optimized.subarray(0, 4).toString('ascii'), 'RIFF', `${optimizedName} has a RIFF container`)
    assert.equal(optimized.subarray(8, 12).toString('ascii'), 'WEBP', `${optimizedName} is WebP encoded`)
    originalBytes += original.size
    optimizedBytes += optimized.byteLength
  }

  assert.ok(optimizedBytes < originalBytes * 0.1, 'optimized transfer payload is under 10% of the original photos')
})
