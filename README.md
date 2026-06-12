# KUKUVERSE Website

## Project structure

```text
frontend/              Static website and admin UI
  index.html
  story.html
  lab.html
  admin.html
  styles.css
  script.js
  admin.css
  admin.js

backend/               Node.js API and local persistence
  server.js
  package.json
  .env.example
  data/
  uploads/              Locally uploaded website images

package.json           Local project start command
```

## Local development

From the project root:

```powershell
npm.cmd start
```

Then open:

- Website: `http://127.0.0.1:4173/story.html`
- Admin: `http://127.0.0.1:4173/admin.html`

The development admin password defaults to `kukuverse-admin`. Set
`ADMIN_PASSWORD` before any public deployment.

## GitHub and Cloudflare

This repo now includes a Cloudflare deployment path that keeps the existing
frontend routes and admin API contract:

- `frontend/`: Cloudflare Pages static output
- `functions/api/[[path]].js`: Pages Functions API backed by D1
- `functions/uploads/[[path]].js`: legacy `/uploads/*` fallback route
- `cloudflare/migrations/0001_initial.sql`: D1 schema
- `cloudflare/scripts/generate-seed.mjs`: generates seed SQL from the local
  `backend/data/*.json` files
- `cloudflare/scripts/upload-to-cloudinary.mjs`: uploads legacy local images
  to Cloudinary and creates a URL map for the seed script
- `wrangler.toml`: local/dev binding template

### 1. Push the repo to GitHub

Create a GitHub repository, then push this project root.

### 2. Create Cloudflare resources

From the project root:

```powershell
npx wrangler d1 create kukuverse-production
```

Copy the returned D1 `database_id` into [wrangler.toml](./wrangler.toml).

### 3. Apply the database schema

```powershell
npx wrangler d1 execute kukuverse-production --file=cloudflare/migrations/0001_initial.sql
```

### 4. Upload existing local images to Cloudinary

Create a free Cloudinary account and collect:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Then upload the local files from `backend/uploads/` and generate a URL map:

```powershell
$env:CLOUDINARY_CLOUD_NAME="your-cloud-name"
$env:CLOUDINARY_API_KEY="your-api-key"
$env:CLOUDINARY_API_SECRET="your-api-secret"
npm run cf:cloudinary-upload
```

This writes [cloudinary-map.json](./cloudflare/cloudinary-map.json), which maps
legacy `/uploads/...` paths to Cloudinary URLs.

### 5. Seed the current local data into D1

Generate the seed file from the local JSON data. If `cloudinary-map.json`
exists, the seed script automatically replaces `/uploads/...` references with
their Cloudinary URLs.

```powershell
npm run cf:seed
```

Then import it:

```powershell
npx wrangler d1 execute kukuverse-production --file=cloudflare/migrations/0002_seed_content.sql
```

### 6. Create the Cloudflare Pages project

In Cloudflare Pages:

- Connect the GitHub repository
- Framework preset: `None`
- Build command: leave empty
- Build output directory: `frontend`

Add these bindings/secrets in the Pages project settings:

- D1 binding: `DB` -> your `kukuverse-production` database
- Secret: `ADMIN_PASSWORD`
- Secret: `RESEND_API_KEY`
- Variable or secret: `RESEND_FROM`
- Secret: `CLOUDINARY_CLOUD_NAME`
- Secret: `CLOUDINARY_API_KEY`
- Secret: `CLOUDINARY_API_SECRET`
- Variable or secret: `CLOUDINARY_UPLOAD_FOLDER`

### 7. Custom domain

If the domain stays on Aliyun DNS:

- subdomain such as `www.example.com`: point a `CNAME` to your Pages domain
- apex/root domain such as `example.com`: move DNS to Cloudflare if you want
  Pages to serve the root directly

### 8. Local Cloudflare dev

```powershell
npm run cf:dev
```

This starts Pages local dev against `frontend/` and the Functions in
`functions/`.
