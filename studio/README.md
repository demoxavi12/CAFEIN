# Cafe In Sanity Studio

This standalone Studio is separate from the public Vite site and Manager Portal. Its schemas model the current menu categories and items plus the Signature Specials carousel. The Studio package owns the Studio dependencies; the website uses only the public Sanity client and image URL packages for anonymous published reads.

## Local setup

1. Install Node.js 22.12 or later and npm.
2. The Studio is configured for project `kgt3bhzl` and dataset `production` in `sanity.config.ts` and `sanity.cli.ts`. The dataset must already exist and your Sanity account must have access; this setup does not create a project or dataset.
3. From this directory, run `npm install`, then `npm run dev`.

Sanity datasets are hosted; starting the Studio connects to the configured dataset. Project IDs and dataset names are public configuration, not secrets. Do not add API tokens to source code; use Sanity's normal authenticated access flow.

## Schema structure

- `menuCategory` preserves the current category ID, label (`name`), short label, blurb, and explicit display order.
- `menuItem` preserves stable IDs, integer whole-rupee prices, category references, section, optional copy/image/confirmation note, sold-out status, allowed badges, and display order.
- Category and special-to-item references are weak while their target content exists only as a draft. The migration keeps `_ref` on the stable published ID and includes `_strengthenOnPublish`, so Sanity requires the target to be published before the referring draft can publish. This keeps the import unpublished while preserving safe publish order.
- Images use Sanity image assets with hotspot support, required alt text when an image is present, and optional `objectPosition` for the legacy image `focus` value.
- `special` stores the current eyebrow/title and an ordered list of `specialEntry` objects.
- Each `specialEntry` must contain exactly one `menuItem` reference or `temporaryContent`. The current four verified menu selections remain references; the six temporary cards remain temporary content until verified by the owners.

Stable IDs use the existing lowercase, hyphenated format. The Studio checks uniqueness while editing. Sanity schema validation is not an API/database constraint, so any later migration/import/API path must independently enforce uniqueness. Ordering values should be assigned from the existing arrays when data is migrated.

## Local validation without publishing

After installing dependencies and setting a real project ID and dataset, run `npm run check`. This runs a local TypeScript check and Sanity's `schemas validate` against the configured workspace. It does not deploy the Studio or publish content. Schema validation may need a configured workspace, but it does not require a deploy token. Avoid `sanity deploy`, `sanity schemas deploy`, and document mutation commands during validation.

## Source backup and migration

- `npm run backup:source` writes a timestamped backup under `../data/backups/`. It uses `data/menu-store.json` as the authoritative menu and preserves the current Signature Specials references and six temporary entries.
- `npm run migration:dry-run` validates source IDs, categories, prices, badges, images, and prints a plan without mutations. It also checks existing stable IDs when the dataset permits read access.
- `npm run migration:preflight` performs the same dry run with the authenticated raw perspective, including existing drafts and published documents. It also reports reusable image assets before any write.
- After review and Sanity CLI login (`npx sanity login` from this folder), `npm run migration:apply-drafts` uploads or reuses image assets and creates only deterministic unpublished drafts. It never publishes content and will not overwrite existing documents. Review and reconcile any conflicts in Studio before publishing.
- The live store has 60 items (58 seed items plus `strawberry-matcha` and `example`) and 4 categories. `example` is preserved but should be reviewed by the owners. Specials contain 4 references to real menu items and 6 temporary cards; temporary cards remain temporary content.
- Local images referenced by the live menu and temporary specials are checked before writes. The current migration plan includes 15 distinct local image files. Missing or unreadable assets stop preflight.

## Public website and cutover

Keep the existing Node/JSON API and Manager Portal available until migrated content is reviewed and published, the public site has verified parity, and the owner workflow is confirmed. A local build is not sufficient evidence to retire the existing source. Public reads must use published Sanity content only; never put an editor token in Vite environment variables or browser code.
