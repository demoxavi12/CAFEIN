# Cafe In Sanity migration inventory

Audit and migration status date: 2026-10-29. The draft-only migration completed after switching references to weak references with `_strengthenOnPublish`. All migrated documents remain drafts; nothing was published.

## Authoritative source

- The live source is `data/menu-store.json`, used by both the Vite development API (`vite.config.ts`) and the Node server (`server/index.mjs`). It is version 1, revision 4, with 4 categories and 60 menu items.
- The live store validates against the existing server validators. All IDs are unique, all menu items have a valid category and integer rupee price, and all 11 distinct menu image paths exist locally.
- `src/data/menu.ts`/`dist/menu-seed.json` has 58 items and the same 4 categories. The first 58 live records match the seed. The live-only records are `strawberry-matcha` (₹170, beverages, section `Coffee & Beverages`, description `matcha blended with strawberry flavour`) and `example` (₹100, beverages, section `Coffee & Beverages`, description `example`). Both remain in migration scope; `example` is flagged for owner review, not silently removed.
- Persisted live menu state: 7 `Bestseller` badges, 0 sold-out items, no `Chef Special` badges, and no `needsConfirmation` values. The schema still supports the allowed `Chef Special`, sold-out, and confirmation-note semantics.
- Category order is the array order in the live store: `beverages`, `quick-bites`, `meals`, `desserts`. Item order is the live array order. The live JSON has no explicit order fields, so the migration must write zero-based positions from these arrays.

## Specials and image mapping

- `src/data/specials.ts` is the current specials source: eyebrow `Signature Specials`, title `Worth the detour`, four references in this order (`biscoff-cheesecake`, `alfredo-penne`, `biscoff-latte`, `vietnamese-iced-coffee`), then six temporary entries: `temp-cappuccino`, `temp-chocolate-tart`, `temp-herb-pasta`, `temp-iced-mocha`, `temp-cafe-toastie`, `temp-caramel-pudding`.
- The six temporary entries remain special-only content; they must not become `menuItem` documents.
- Menu image paths are local `/images/...` references, with alt, intrinsic dimensions, and optional `focus` metadata. All 11 distinct paths used by the live menu exist. Specials introduce additional distinct local images (`interior-lantern-pendant.webp`, `interior-botanical-mural.webp`, `interior-dining-room.webp`, and `decor-golden-buddha.webp`); migration must deduplicate shared source paths across menu and specials.
- `menu-1.jpeg` and `menu-2.jpeg` are menu-board reference images, not product assets; they are not referenced by the menu image fields and are not migration targets.

## Current architecture and cutover dependencies

- Public data consumers: `MenuSection`, `SignatureSpecials`, and `DigitalMenuView`; the first two plus the digital menu currently use `useLiveMenu()` from `src/digital-menu/adminStore.ts` and read `/api/menu`.
- The custom Manager Portal uses `/api/admin/*`, session/CSRF authentication, JSON import/export, and the optional R2 image adapter. The R2 integration is present but configuration names for R2 are absent from the local environment.
- The project-level `.env` key names include `ADMIN_PASSWORD_HASH`, `PUBLIC_ORIGIN`, `NODE_ENV`, and `MENU_STORE_PATH`; no Sanity or R2 token variable is configured. Secret values were not read or copied.
- The standalone Studio is configured for project `kgt3bhzl` and dataset `production`, with schemas `menuCategory`, `menuItem`, `special`, and `specialEntry`, plus an owner-friendly desk structure.
- For draft-only migration, category and special-to-item reference fields are weak in the schema. The migration uses stable published IDs with `_weak: true` and `_strengthenOnPublish`; Sanity's reference input/content actions require target publication before publishing the referring document. Draft references do not point at `drafts.*` IDs.
- The frontend has an anonymous published-content Sanity client and maps menu/category/special documents to the existing UI types. It prefers published Sanity menu content and falls back to the legacy `/api/menu` while Sanity is empty or unavailable. The Manager Portal continues to use the JSON API. It is hidden from the digital menu only when published Sanity content is active; no API or authentication code has been retired.
- There is no Vercel function directory or `vercel.json`; `server/index.mjs` is a standalone Node server, while Vite has local API middleware. Vercel needs an API adapter or separate API hosting until the legacy server is retired.

## Cutover safety

Before migration writes, a complete timestamped source backup was created at `data/backups/sanity-migration-2026-10-29T10-12-15-761Z.json`; the tests confirm it matches the current live JSON and specials. An initial attempt created the four category drafts and processed 15 image hashes, then stopped because a strong reference targeted a category without a published document. No menu-item or special drafts were created in that attempt.

After updating the reference strategy, the authenticated raw-perspective preflight found exactly four expected category drafts, no conflicting published document IDs, and all 15 expected image assets already present by SHA-1. The resumable draft-only migration reused the four category drafts and all 15 image assets, uploaded zero assets, and created 60 menu-item drafts plus one Signature Specials draft. Read-only verification found 4 category drafts, 60 menu-item drafts, and 1 special draft; zero published content documents; 60 resolving category references; four resolving real special references; six temporary special entries; 15 expected image assets with no duplicate hashes; and no verification issues. The live-only `example` record remains included and flagged for owner review. The website continues preferring published Sanity content with the legacy `/api/menu` fallback; no API or authentication code has been retired. Do not publish or retire legacy systems until owners review the drafts, confirm `example` and temporary specials, and verify parity. Root and Studio dependency lockfiles contain installed dependencies; the pre-repair Studio lock copy remains local and is excluded from Git.
