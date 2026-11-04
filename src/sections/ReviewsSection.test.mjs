import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const sectionUrl = new URL('./ReviewsSection.tsx', import.meta.url)
const component = await readFile(sectionUrl, 'utf8')
const homepage = await readFile(new URL('../App.tsx', import.meta.url), 'utf8')
const dataset = JSON.parse(await readFile(new URL('../data/reviews.json', import.meta.url), 'utf8'))
const archiveDirectory = new URL('../../archive/google-reviews/', import.meta.url)

test('homepage carousel renders 21 unique dataset reviews with expandable complete reviews', () => {
  assert.match(homepage, /<ReviewsSection\s*\/>/)
  assert.equal(dataset.length, 21)
  assert.equal(new Set(dataset.map(({ id }) => id)).size, 21)
  assert.equal(new Set(dataset.map(({ text }) => text)).size, 21)
  assert.ok(dataset.every(({ id, name, text, rating }) => id && name.trim() && text.trim() && [4, 5].includes(rating)))
  assert.deepEqual([...new Set(dataset.map(({ rating }) => rating))].sort(), [4, 5])
  assert.equal(dataset.filter(({ truncated }) => truncated === true).length, 1)

  assert.match(component, /from '\.\.\/data\/reviews\.json\?raw'/)
  assert.match(component, /reviews\.slice\(groupIndex \* reviewsPerGroup/)
  assert.match(component, /groupReviews\.map\(\(review, index\)/)
  assert.match(component, /key=\{review\.id\}/)
  assert.match(component, /review\.rating/)
  assert.match(component, /!review\.truncated/)
  assert.match(component, /aria-expanded=\{expanded\}/)
  assert.match(component, /Read more/)
  assert.match(component, /Read less/)
  assert.match(component, /whitespace-pre-line/)
  assert.doesNotMatch(component, /review\.dateLabel/)
  assert.doesNotMatch(component, /\/images\/google-reviews\//)
  assert.match(component, /desktop \? 3 : tablet \? 2 : 1/)
  assert.match(component, /AUTO_ADVANCE_MS = 7_000/)
  assert.match(component, /window\.setTimeout/)
  assert.match(component, /window\.clearTimeout/)
  assert.match(component, /onPanEnd/)
  assert.match(component, /setExpandedReviewIds/)
  assert.match(component, /getBoundingClientRect\(\)\.height/)
  assert.match(component, /ResizeObserver/)
  assert.match(component, /aria-label="Show previous review group"/)
  assert.match(component, /aria-label="Show next review group"/)
  assert.match(component, /aria-label=\{autoPaused \? 'Resume review autoplay' : 'Pause review autoplay'\}/)
  assert.match(component, /self-start rounded-xl/)
  assert.doesNotMatch(component, /<motion\.article\s+className="[^"]*\bh-full\b/)
  assert.doesNotMatch(component, /<blockquote className="[^"]*\bflex-1\b/)
})

test('original Google review screenshots are preserved outside public assets', async () => {
  const archivedFiles = (await readdir(archiveDirectory)).sort()
  const expectedFiles = Array.from({ length: 24 }, (_, index) => `review-${String(index + 1).padStart(2, '0')}.jpeg`)
  assert.deepEqual(archivedFiles, expectedFiles)

  for (const filename of expectedFiles) {
    const image = await readFile(new URL(filename, archiveDirectory))
    assert.equal(image[0], 0xff, `${filename} has the JPEG start marker`)
    assert.equal(image[1], 0xd8, `${filename} has the JPEG start marker`)
  }
})
