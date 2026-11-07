# Vercel Manager Portal and Sanity content

## Production architecture

The public React website is hosted on Vercel. Files under /api are Vercel Node Functions; the catch-all function in api/[...path].mjs serves the same-origin menu and manager endpoints. Published menu reads use Sanity's published perspective only. If Sanity has no complete valid published menu or the read fails, /api/menu returns the tracked seed generated at build time (dist/menu-seed.json). Drafts are never used as a public fallback.

The existing standalone Node/JSON server and R2 adapter remain in the repository for local development and rollback while the Vercel path is reviewed. They are not required by the Vercel deployment. Vite's /api/menu remains backed by the local JSON store. The local draft preview is separate Vite development middleware; the production function returns 404 for /api/preview/sanity-drafts.

## Required Vercel environment variables

Set these in the Vercel project as server-only Production (and Preview only if that environment should have manager access) variables, then create a new deployment:

- SANITY_API_TOKEN: a Sanity token limited to the production dataset and only the permissions needed to read drafts, edit menu items, upload assets, and publish approved menu documents. Never prefix it with VITE_.
- MANAGER_PASSWORD_HASH: bcrypt hash generated locally with `npm run manager:hash`. The command prompts twice without echoing the password. Set this server-only Vercel variable to the resulting hash; do not put the password in an environment variable.
- ADMIN_PASSWORD_HASH: legacy scrypt hash retained temporarily as a login fallback during the password-hash migration. Keep it unchanged while adding `MANAGER_PASSWORD_HASH`; remove it only after confirming the existing manager password successfully logs in with the bcrypt hash.
- ADMIN_SESSION_SECRET: at least 32 random bytes, generated with a password manager or a secure random generator. This signs stateless HttpOnly sessions and is not the Sanity token.
- PUBLIC_ORIGIN: one or more comma-separated exact deployed HTTPS origins, such as https://cafe-in-eight.vercel.app,https://www.cafein.co.in. Each origin is checked exactly; wildcards and non-HTTPS production origins are rejected.

Public project configuration defaults to project kgt3bhzl, dataset production, and can be explicitly set with SANITY_PROJECT_ID and SANITY_DATASET. These IDs are not credentials.

The function fails closed for manager login if both password-hash variables, the session secret, or the Sanity write token are absent. `MANAGER_PASSWORD_HASH` is checked first; the legacy scrypt hash remains a fallback until it is removed. Migration without password rotation: run `npm run manager:hash` in a private interactive terminal and enter the current manager password twice; add the emitted bcrypt hash as the Production (and intended Preview) `MANAGER_PASSWORD_HASH`, leaving `ADMIN_PASSWORD_HASH` in place; deploy and verify login with the existing password; then remove `ADMIN_PASSWORD_HASH` and redeploy to finish the migration. Do not run the old `npm run admin:hash` command for this migration because it generates a new random password. No credentials are changed by this code task.

## Manager workflow and authorization

The current portal has one manager password and no separate role matrix. The Vercel API verifies a bcrypt `MANAGER_PASSWORD_HASH` server-side, with the legacy scrypt `ADMIN_PASSWORD_HASH` as a migration fallback, then issues a signed session cookie (HttpOnly, SameSite=Strict, Secure in production), checks a manager role claim, verifies same-origin mutations, and requires a CSRF token. Manager sessions have a fixed 30-minute maximum lifetime. Because Vercel instances are stateless, a copied signed cookie cannot be revoked individually; rotate ADMIN_SESSION_SECRET to invalidate all sessions. The Sanity write token is only read by the server function.

Saving or importing menu changes writes Sanity drafts; it does not publish. The Publish approved menu button is a separate explicit action. It publishes draft categories before eligible menu items so weak references can strengthen on publish. The example item remains a draft for owner review. Signature Specials stay under the existing authenticated Sanity Studio authoring and publish controls; they are not published by the Manager Portal menu action.

Vercel function instances are stateless. The endpoint includes per-instance failed-login throttling as a defense in depth. Configure and verify a Vercel Firewall/WAF rate-limit rule for /api/admin/login before production rollout because an in-memory limiter cannot provide a global limit across instances. The project dashboard configuration is not accessible from this workspace.

Menu photo uploads are sent to the function and stored as Sanity image assets. Uploads are limited to 4 MB to stay below the Vercel 4.5 MB function request limit, and JPEG/PNG signatures and image dimensions are checked server-side. Replacing/removing an image does not delete a Sanity asset; this avoids deleting assets still referenced elsewhere, but can leave unused assets for later Studio cleanup. Menu-item deletion is blocked in the Vercel manager because Sanity has no menu deletion draft in this workflow; handle removals in Studio after editorial review and explicit approval.

## Local development and rollback

- npm run dev keeps the current Vite middleware backed by the local data/menu-store.json JSON store and exposes the local-only Sanity draft preview.
- npm start runs the legacy standalone Node/JSON server. Its persistent file store and optional R2 photo adapter remain unchanged as a rollback/local path.
- The Vercel function is exercised in unit tests with mocked Sanity clients; it has not been deployed or verified against production settings in this task.
- Vercel automatically exposes files in the project /api directory as Node Functions. vercel.json includes the generated fallback seed file inside that function bundle.
- Vercel's function request/response payload limit is 4.5 MB. The upload endpoint deliberately accepts less than that limit.
