import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  createDraftPreviewPayload,
  createSanityDraftPreviewHandler,
  DRAFT_PREVIEW_QUERY,
  EXPECTED_DRAFT_PREVIEW,
  SANITY_DRAFT_PREVIEW_PATH,
} from './sanity-preview.mjs'

const draft = (id) => ({ _id: id, _originalId: `drafts.${id}` })

function makeFixture() {
  const categories = ['beverages', 'quick-bites', 'meals', 'desserts'].map((id, order) => ({
    ...draft(`menuCategory-${id}`), id, label: `Category ${order}`, short: `C${order}`, blurb: `Blurb ${order}`, order,
  }))
  const items = Array.from({ length: 60 }, (_, index) => ({
    ...draft(`menuItem-${index}`), id: `item-${index}`, name: `Item ${index}`, price: 50 + index,
    categoryId: categories[index % categories.length].id, section: 'Test section', description: `Description ${index}`,
    image: { asset: { _ref: `image-${index % 15}` }, alt: `Alt ${index}`, objectPosition: '50% 40%', width: 800, height: 600 },
    isSoldOut: index === 0, badge: index === 1 ? 'Bestseller' : undefined, _updatedAt: new Date(index + 1).toISOString(),
  }))
  const special = {
    ...draft('special-signature-specials'), eyebrow: 'Signature Specials', title: 'Worth the detour',
    items: Array.from({ length: 10 }, (_, index) => index < 4
      ? { id: `item-${index}`, order: index, menuItem: items[index] }
      : { id: `temp-${index}`, order: index, temporaryContent: {
        id: `temp-${index}`, name: `Temporary ${index}`, price: 120, categoryId: categories[0].id,
        section: 'Temporary', description: 'Temporary item',
        image: { asset: { _ref: `image-${(index + 4) % 15}` }, alt: `Temp alt ${index}`, width: 600, height: 600 },
      } }),
  }
  const assets = Array.from({ length: 15 }, (_, index) => ({ _id: `image-${index}` }))
  const calls = []
  const client = {
    fetch: async (query, params) => {
      calls.push({ query, params })
      if (query === DRAFT_PREVIEW_QUERY) return { categories, items, special }
      return assets.filter(({ _id }) => params.assetIds.includes(_id))
    },
  }
  const imageUrlBuilderFactory = () => ({ image: () => ({ auto() { return this }, fit() { return this }, url() { return 'https://cdn.sanity.io/images/project/production/image.jpg' } }) })
  return { client, calls, imageUrlBuilderFactory, categories, items, special, assets }
}

function mockResponse() {
  return {
    headers: {}, status: 0, body: '',
    writeHead(status, headers) { this.status = status; this.headers = headers },
    end(body) { this.body = body },
    setHeader(name, value) { this.headers[name] = value },
  }
}

function request({ path = SANITY_DRAFT_PREVIEW_PATH, method = 'GET', host = 'localhost:5173', remoteAddress = '127.0.0.1', origin, fetchSite } = {}) {
  return {
    url: path,
    method,
    headers: { host, ...(origin ? { origin } : {}), ...(fetchSite ? { 'sec-fetch-site': fetchSite } : {}) },
    socket: { remoteAddress },
  }
}

test('draft perspective query resolves weak references and excludes published content', async () => {
  assert.match(DRAFT_PREVIEW_QUERY, /menuItem->/)
  assert.match(DRAFT_PREVIEW_QUERY, /category->id/)
  assert.match(DRAFT_PREVIEW_QUERY, /_originalId/)
  const { client, calls, imageUrlBuilderFactory } = makeFixture()
  const result = await createDraftPreviewPayload(client, { imageUrlBuilderFactory })
  assert.deepEqual(result.summary, {
    categoryCount: 4, menuItemCount: 60, realSpecialReferences: 4,
    temporarySpecialEntries: 6, imageAssetCount: 15, publishedDocumentCount: 0,
    documentCounts: {
      menuCategory: { drafts: 4, published: 0 },
      menuItem: { drafts: 60, published: 0 },
      special: { drafts: 1, published: 0 },
    },
  })
  assert.equal(result.menu.categories.length, 4)
  assert.equal(result.menu.items.length, 60)
  assert.equal(result.menu.items[0].image.alt, 'Alt 0')
  assert.equal(result.menu.items[0].image.focus, '50% 40%')
  assert.equal(result.menu.items[0].image.src.startsWith('https://cdn.sanity.io/'), true)
  assert.equal(result.menu.items[0].isSoldOut, true)
  assert.equal(result.specials.entries.filter(({ kind }) => kind === 'reference').length, 4)
  assert.equal(result.specials.entries.filter(({ kind }) => kind === 'temporary').length, 6)
  assert.equal(calls[0].query, DRAFT_PREVIEW_QUERY)
  assert.equal(calls[1].params.assetIds.length, EXPECTED_DRAFT_PREVIEW.imageAssets)
})

test('rejects unresolved weak category and special references instead of dropping content', async () => {
  const fixture = makeFixture()
  fixture.items[0].categoryId = 'missing-category'
  await assert.rejects(createDraftPreviewPayload(fixture.client, { imageUrlBuilderFactory: fixture.imageUrlBuilderFactory }), /unresolved category/)

  const second = makeFixture()
  second.special.items[0].menuItem = undefined
  await assert.rejects(createDraftPreviewPayload(second.client, { imageUrlBuilderFactory: second.imageUrlBuilderFactory }), /missing or ambiguous item reference/)
})

test('rejects published or incomplete data and missing image assets', async () => {
  const publishedFixture = makeFixture()
  publishedFixture.items[0]._originalId = 'menuItem-0'
  await assert.rejects(createDraftPreviewPayload(publishedFixture.client, {
    expected: { ...EXPECTED_DRAFT_PREVIEW, menuItems: 59 },
    imageUrlBuilderFactory: publishedFixture.imageUrlBuilderFactory,
  }), /published documents; received 1/)

  const missingAssetFixture = makeFixture()
  missingAssetFixture.client.fetch = async (query, params) => query === DRAFT_PREVIEW_QUERY
    ? { categories: missingAssetFixture.categories, items: missingAssetFixture.items, special: missingAssetFixture.special }
    : []
  await assert.rejects(createDraftPreviewPayload(missingAssetFixture.client, { imageUrlBuilderFactory: missingAssetFixture.imageUrlBuilderFactory }), /missing 15 referenced Sanity image assets/)
})

test('local preview route is loopback-only, same-origin, and GET-only', async () => {
  let calls = 0
  const handler = createSanityDraftPreviewHandler({ runPreview: async () => { calls++; return { safe: true } } })
  const denied = mockResponse()
  handler(request({ remoteAddress: '203.0.113.4' }), denied, () => assert.fail('route must not continue'))
  assert.equal(denied.status, 403)
  assert.equal(calls, 0)

  const wrongOrigin = mockResponse()
  handler(request({ origin: 'https://evil.example' }), wrongOrigin, () => assert.fail('route must not continue'))
  assert.equal(wrongOrigin.status, 403)
  assert.equal(calls, 0)

  const crossSite = mockResponse()
  handler(request({ fetchSite: 'cross-site' }), crossSite, () => assert.fail('route must not continue'))
  assert.equal(crossSite.status, 403)

  const wrongMethod = mockResponse()
  handler(request({ method: 'POST' }), wrongMethod, () => assert.fail('route must not continue'))
  assert.equal(wrongMethod.status, 405)
  assert.equal(calls, 0)

  const response = mockResponse()
  handler(request({ origin: 'http://localhost:5173' }), response, () => assert.fail('route must not continue'))
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(response.status, 200)
  assert.equal(response.headers['Cache-Control'], 'no-store')
  assert.deepEqual(JSON.parse(response.body), { safe: true })
  assert.equal(calls, 1)
})

test('preview failures return a sanitized fallback message and do not leak process errors', async () => {
  const handler = createSanityDraftPreviewHandler({ runPreview: async () => { throw new Error('private credential detail') } })
  const response = mockResponse()
  handler(request(), response, () => assert.fail('route must not continue'))
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(response.status, 503)
  assert.doesNotMatch(response.body, /private credential detail/)
  assert.match(response.body, /existing menu fallback/)
})

test('draft access stays in authenticated local tooling while public reads and JSON fallback remain separate', async () => {
  const root = path.resolve(import.meta.dirname, '..')
  const [previewScript, studioPackage, clientSource, storeSource, viteSource] = await Promise.all([
    readFile(path.join(root, 'studio/scripts/preview-drafts.mjs'), 'utf8'),
    readFile(path.join(root, 'studio/package.json'), 'utf8'),
    readFile(path.join(root, 'src/digital-menu/sanityContent.ts'), 'utf8'),
    readFile(path.join(root, 'src/digital-menu/adminStore.ts'), 'utf8'),
    readFile(path.join(root, 'vite.config.ts'), 'utf8'),
  ])
  assert.match(studioPackage, /sanity exec scripts\/preview-drafts\.mjs --with-user-token/)
  assert.match(previewScript, /perspective:\s*'drafts'/)
  assert.match(previewScript, /useCdn:\s*false/)
  assert.match(clientSource, /perspective:\s*'published'/)
  assert.match(clientSource, /useCdn:\s*true/)
  assert.match(storeSource, /fetchPublishedMenu/)
  assert.match(storeSource, /'\/api\/menu'/)
  assert.match(storeSource, /Preview failures continue through the existing published Sanity and JSON\/API fallback/)
  assert.match(viteSource, /configureServer\(server: ViteDevServer\)/)
  assert.doesNotMatch(viteSource, /configurePreviewServer/)
  assert.doesNotMatch(previewScript + viteSource, /(?:VITE_)?SANITY_API_TOKEN|Bearer\s+[A-Za-z0-9._-]{20,}/)
})
