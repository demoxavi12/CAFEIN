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

test('intro videos, responsive hero photos, and the official logo resolve to optimized assets', async () => {
  const [intro, hero, registry, html] = await Promise.all([
    readFile(new URL('../components/IntroAnimation.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../sections/HeroSection.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./images.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
  ])
  const videoPaths = [...intro.matchAll(/src: "(\/videos\/intro-[1-4]\.mp4)"/g)].map((match) => match[1])
  assert.deepEqual(videoPaths, [1, 2, 3, 4].map((number) => `/videos/intro-${number}.mp4`))
  for (const videoPath of videoPaths) {
    assert.ok((await stat(new URL(`../../public${videoPath}`, import.meta.url))).size > 0, `${videoPath} exists with exact casing`)
  }

  const variants = ['sitiing-768.webp', 'sitiing-1280.webp', 'sitiing-1920.webp']
  let variantBytes = 0
  for (const filename of variants) {
    const data = await readFile(new URL(`../../public/images/optimized/${filename}`, import.meta.url))
    assert.equal(data.subarray(0, 4).toString('ascii'), 'RIFF', `${filename} has a RIFF container`)
    assert.equal(data.subarray(8, 12).toString('ascii'), 'WEBP', `${filename} is WebP encoded`)
    variantBytes += data.byteLength
  }
  const heroOriginal = await stat(new URL('../../public/images/sitiing.jpeg', import.meta.url))
  assert.ok(variantBytes < heroOriginal.size * 0.1, 'responsive hero variants are under 10% of the original image size')
  assert.match(hero, /<source[\s\S]*?type="image\/webp"[\s\S]*?srcSet=/)
  assert.match(hero, /sizes="\(min-width: 1280px\) 55vw, \(min-width: 768px\) 70vw, 95vw"/)

  const logo = await readFile(new URL('../../public/images/optimized/logo-svg-medallion.webp', import.meta.url))
  const sourceLogo = await stat(new URL('../../public/images/logo-svg-medallion.png', import.meta.url))
  assert.equal(logo.subarray(8, 12).toString('ascii'), 'WEBP')
  assert.ok(logo.byteLength < sourceLogo.size, 'lossless WebP logo is smaller than its PNG source')
  assert.match(registry, /src: '\/images\/optimized\/logo-svg-medallion\.webp'/)
  assert.match(html, /rel="preload" as="image" href="\/images\/optimized\/logo-svg-medallion\.webp" fetchpriority="high"/)
  assert.match(html, /rel="preload" as="video" href="\/videos\/intro-1\.mp4"/)
  assert.doesNotMatch(html, /rel="preload" as="video" href="\/videos\/intro-[234]\.mp4"/)
})

test('intro advances only after media readiness and handles failed playback safely', async () => {
  const intro = await readFile(new URL('../components/IntroAnimation.tsx', import.meta.url), 'utf8')

  assert.match(intro, /onLoadedData=\{/)
  assert.match(intro, /onCanPlay=\{/)
  assert.match(intro, /video\.play\(\)\.catch\(\(\) => advanceClip\(index\)\)/)
  assert.match(intro, /onEnded=\{/)
  assert.match(intro, /onError=\{/)
  assert.match(intro, /VIDEO_LOAD_TIMEOUT_MS/)
  assert.match(intro, /VIDEO_STALL_TIMEOUT_MS/)
  assert.match(intro, /NEXT_VIDEO_TIMEOUT_MS/)
  assert.match(intro, /readyPreloadIndex\.current === nextIndex/)
  assert.match(intro, /video\.readyState >= HTMLMediaElement\.HAVE_CURRENT_DATA/)
  assert.match(intro, /key=\{index\}/)
  assert.match(intro, /new Set\(PHOTO_SET\)/)
  assert.match(intro, /image\.decode\(\)/)
  assert.match(intro, /image\.fetchPriority = "low"/)
  assert.doesNotMatch(intro, /\bautoPlay\b/)
})
