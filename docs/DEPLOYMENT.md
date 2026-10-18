# Deploying to Cloudflare Pages

The application is a **static site**. There is no backend, no database, no
Worker, no Pages Function, no server route, no authentication service and no
runtime secret. Everything it needs is built into `dist/` at build time.

## Build settings

| Setting | Value |
|---|---|
| Framework preset | None (or Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node version | 20 or later (set `NODE_VERSION=20` if the default is older) |
| Environment variables | None required |

`npm run build` runs `tsc -b` then `vite build`. It does **not** re-fetch source
data: the prepared dataset in `public/data` is committed, so builds are
reproducible and do not depend on an external API being reachable at deploy
time. See [DATA.md](DATA.md) for how to refresh it.

## SPA routing

All analytical state lives in the query string, so there is exactly one HTML
entry point. `public/_redirects` contains:

```
/*  /index.html  200
```

The `200` is a rewrite, not a redirect, so a shared deep link such as
`/?v=explain&g=nhs&i=93577&a=E54000008` keeps its URL in the address bar and
restores the exact view. A `302` would rewrite the URL and lose it.

`public/_headers` sets security headers and cache policy. Hashed assets under
`/assets/` are immutable; files under `/data/` revalidate hourly so a redeploy
is picked up without a hard refresh.

Both files are copied verbatim into `dist/` by Vite because they live in
`public/`. They are Cloudflare Pages conventions and are ignored elsewhere.

## Asset paths

All assets are referenced relatively from the site root, and data files are
fetched from `${import.meta.env.BASE_URL}data/...`. The site therefore works at
a domain root (`https://atlas.example.org/`) without configuration. To serve it
from a sub-path instead, set Vite's `base` option and rebuild.

## First deployment

1. Push the repository to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repository, set the build command and output directory above.
4. Deploy. The first build takes a few minutes, mostly `npm install`.

## Custom domain

**Workers & Pages → your project → Custom domains → Set up a custom domain.**

Enter the subdomain (for example `atlas.example.org`). When the zone is already
on Cloudflare, the required `CNAME` is created automatically and the certificate
is issued within a few minutes. No DNS record needs to be created by hand, and
creating one manually before attaching the custom domain can leave the record
pointing nowhere.

## Checks before going live

- `npm run build` succeeds.
- `npm test` — unit tests.
- `npm run smoke` — browser tests against the production build, including the
  SPA fallback and the download paths.
- `npm run data:validate` — the committed dataset is internally consistent.

## What is deliberately absent

- No Pages Functions or Workers.
- No API keys, tokens or runtime secrets.
- No third-party CORS proxy.
- No runtime calls to Fingertips or the ONS portal. Those are build-time only,
  in `scripts/prepare-data`, and are not part of the deployed site.
