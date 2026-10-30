# Cafe In — cinematic website demo

Cafe In website and digital menu. React 19 + Vite + TypeScript + Tailwind CSS v4, animated with Motion and Lenis. The public app reads published menu and specials from Sanity when available; the existing Node/JSON API remains as a recovery fallback until migration parity and owner workflow are verified.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm run lint
npm test
npm start          # legacy local Node server and JSON API (rollback path)
```

## Sanity Studio and content

The standalone Studio lives in `studio/`, configured for project `kgt3bhzl` and dataset `production`. From `studio/`, run `npm install`, `npm run dev`, `npm run check`, `npm run build`, and `npm run test:migration-source`. Authenticate with `npx sanity login` in the Studio directory. Editors manage menu categories, menu items, images, stock/badges, and Signature Specials through Studio; only published content is read by the public frontend. No write token belongs in the React app.

The frontend's public Sanity client is configured in `src/digital-menu/sanityContent.ts` and uses anonymous published reads. Vercel serves the same-origin `/api/*` routes from `api/[...path].mjs`; `/api/menu` reads the published Sanity perspective and falls back to the tracked seed when no valid published menu is available. The Vercel Manager Portal stores edits as Sanity drafts and publishes only after an explicit manager confirmation. The standalone Node/JSON and R2 adapters remain as a local rollback path; they are not required by the Vercel deployment.

Vercel Function secrets are documented in [the manager portal setup guide](docs/manager-portal-setup.md). Never expose `SANITY_API_TOKEN`, `ADMIN_PASSWORD_HASH`, or `ADMIN_SESSION_SECRET` through a `VITE_` variable or browser code. The local draft-preview endpoint remains a Vite development middleware and is not implemented by the production API function.

### Safe migration workflow

1. `cd studio` and run `npm run backup:source`. This creates a timestamped local backup under `data/backups/` from the authoritative live `data/menu-store.json` plus the current special lineup. Do not commit this local backup.
2. Run `npm run test:migration-source` and `npm run migration:dry-run`. Dry-run validates all records and local image files and queries for existing stable IDs without writing.
3. Review `docs/sanity-migration-inventory.md`; in particular, confirm the live-only `example` menu entry with the owners.
4. After authentication, run `npm run migration:apply-drafts`. This creates unpublished draft documents and uploads/reuses local image assets; it never publishes. Inspect all drafts and image placement in Studio, then publish them through Studio only after approval.
5. Verify the public site uses the published Sanity menu and specials, check prices/categories/stock/badges/images against the backup, and confirm owners can edit/publish in Studio before separately approving removal of legacy services.

No Sanity token is required in frontend environment variables. `studio/` uses the authenticated Sanity CLI session for migration writes; never place an editor token in Vite configuration.

### Hosting and recovery notes

- The project includes a standalone Node server (`server/index.mjs`), Vite development middleware, and Vercel Functions under `api/`. Vercel uses the serverless Sanity implementation; local Node/JSON and R2 storage remain available as a recovery path.
- The production dataset must allow anonymous read access for the public website. Studio writes require an authorized project member. Keep editing roles restricted to trusted owners/editors.
- If Sanity has no complete published menu or is temporarily unavailable, `/api/menu` serves the build-time tracked menu seed. The timestamped JSON backup remains available for a controlled recovery of legacy data and special metadata; retain it locally until Sanity parity is confirmed.

The homepage intro plays on each full page load; use **Skip Intro** to dismiss it. Standalone menu routes do not show the homepage intro, and returning from a menu route in-page reveals the completed homepage without replaying it.

## Other source files

| What | File |
| --- | --- |
| Hero copy, address, phone, hours, socials, map | `src/data/business.ts` |
| Legacy seed menu and categories | `src/data/menu.ts` |
| Legacy Signature Specials fallback | `src/data/specials.ts` |
| Reviews | `src/data/reviews.ts` |
| Gallery order and captions | `src/data/gallery.ts` |
| Photo registry (alt text, crop focus) | `src/data/images.ts` |

Fields left as `null` are hidden in the UI or shown as clearly labelled placeholders. Menu entries marked `needsConfirmation` show a † / "To confirm" flag.

## Assets

- `photos/`: the nine original screenshots as supplied (unchanged).
- `public/images/`: seven photos, cropped only to remove browser UI and white edges, then saved as WebP.
- `docs/menu-reference/`: the two menu boards that `menu.ts` was transcribed from.

## Still needed from Cafe In

1. Official address, Google Maps link and embed, phone, email, opening hours, social links.
2. Genuine customer reviews (with permission).
3. Higher-resolution originals of the photos. The supplied ones are ~500px screenshots and look soft on large or retina screens.
4. Photos of more dishes. Only Alfredo Penne and Biscoff Cheesecake have real photos.
5. Confirmation that the penne photo is the Alfredo Penne and the cheesecake photo is the Biscoff Cheesecake (matched by appearance).
6. Dessert descriptions (cut off in the menu screenshot) and the full "Beyond Coffee" section (only Hot Chocolate ₹100 is visible).
7. Approval of the provisional hero line "Your moment. Your coffee." and the four featured specials.
