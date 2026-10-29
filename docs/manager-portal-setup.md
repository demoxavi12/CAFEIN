# Manager portal server setup

The app now expects a Node.js server for manager authentication and menu persistence. `npm run dev` attaches the API to Vite for local work; production should run `npm run build` followed by `npm start` behind an HTTPS reverse proxy.

## Required production configuration

- `ADMIN_PASSWORD_HASH`: create it with `npm run admin:hash`. It generates a one-time random 256-bit manager password and its scrypt hash. Save the password in the password manager and the hash in the server secret manager.
- `PUBLIC_ORIGIN`: the exact public origin, including scheme and port when nonstandard (for example, `https://cafe.example`). It is required in production for same-origin mutation checks.
- `MENU_STORE_PATH`: optional absolute path to the persistent menu JSON file. The default is `data/menu-store.json` under the project root. The server creates it from the current menu source only when no store exists; it does not reseed an existing file.
- `NODE_ENV=production`: enables secure session cookies. Keep the service behind HTTPS for the whole admin session.

## Persistent menu photo storage

Menu photos are uploaded through the authenticated Cafe In server and stored in Cloudflare R2. The API uses the R2 S3-compatible endpoint with server-side Signature Version 4; object bytes are never written into the menu JSON or the deployment filesystem. Public menu cards store only an image reference and its dimensions.

Configure these values in the server secret manager (and in a local, untracked `.env` file for development):

- `R2_ACCOUNT_ID`: the Cloudflare account ID.
- `R2_BUCKET`: the R2 bucket name.
- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`: an R2 API token scoped to the bucket with object read, write, and delete permissions. These values stay on the server.
- `R2_PUBLIC_URL`: the HTTPS public base URL mapped to this bucket, such as an R2 custom domain. Do not include a trailing object path, query string, or credentials.

The admin upload form accepts JPEG and PNG images up to 5 MB and 40 megapixels. The server checks the file signature and dimensions, generates UUID object keys, and rejects unconfigured storage rather than reporting a false success. Server-side uploads do not require browser-to-bucket CORS rules. Replaced or removed images are deleted after the menu update succeeds and only when no item still references them; cleanup is best-effort if R2 is temporarily unavailable. Older menu backups that omit an image field retain the current photo for matching item IDs.

R2 credentials and a public domain are not configured in this workspace. Until those server values exist, the upload route returns a clear `503` configuration error; no persistent photo upload has been verified against a live bucket.

The session cookie is HttpOnly and SameSite=Strict. Sessions expire after 30 minutes idle or 8 hours absolute and are revoked on sign-out or server restart. Failed logins are rate limited per connecting IP. The API uses CSRF tokens, origin checks, server-side authorization, validated JSON, atomic file replacement and revision checks.

## Deployment limits

This no-dependency store is designed for one Node server process with a persistent writable disk. All devices using that server share its current menu. Do not run multiple server replicas against separate disks or place this JSON store on an ephemeral filesystem. For horizontal scaling, managed hosting, or a higher availability requirement, configure a shared transactional database and shared session/rate-limit storage before production use. HTTPS termination, backups, monitoring, and secret-manager configuration are supplied by deployment infrastructure and have not been configured or verified here.

The previous manager kept edits only in each browser's local storage, which cannot be treated as server truth automatically. After sign-in, the manager offers **Review saved browser edits** when it finds those old overrides. It validates and previews the merged full menu, and only removes the old browser copy after an authenticated manager confirms a successful import. If browser storage is unavailable or contains invalid values, export or record the changes and enter them through the manager instead.
