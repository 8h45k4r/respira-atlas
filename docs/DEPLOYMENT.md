# Deploying to Cloudflare

The application is a **static site**. There is no backend, no database, no
server route, no authentication service and no runtime secret. There is no
Worker script either: `wrangler.jsonc` declares no `main` entry point, so
nothing runs server-side — Cloudflare serves the built files from its asset
store at the edge.

This release is deployed with **Cloudflare Workers Static Assets**, which is the
current way Cloudflare builds and hosts static sites from a Git repository.
(The older Pages workflow still exists and would also work; notes for it are at
the bottom.)

## Configuration

`wrangler.jsonc`:

```jsonc
{
  "name": "respira-atlas",
  "compatibility_date": "2026-10-18",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

`not_found_handling: "single-page-application"` serves `index.html` for any path
that is not a real asset, with a **200 rather than a redirect**, so a shared
deep link such as `/?v=explain&g=nhs&i=93577&a=E54000008` keeps its URL in the
address bar and restores the exact view. A redirect would rewrite the URL and
lose the analytical state.

## Build settings

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Environment variables | None required |

`npm run build` runs `tsc -b` then `vite build`. It does **not** re-fetch source
data: the prepared dataset in `public/data` is committed, so builds are
reproducible and do not depend on an external API being reachable at deploy
time. See [DATA.md](DATA.md) for how to refresh it.

Every push to `main` triggers a build and deploy.

## Deploying from a local machine

```bash
npm run deploy      # builds, then wrangler deploy
```

This needs `wrangler login` once. It is not required for the Git-connected
deployment, which builds on Cloudflare.

## Headers and caching

`public/_headers` is copied into `dist/` by Vite and honoured by Workers Static
Assets. It sets security headers and cache policy: hashed assets under
`/assets/` are immutable, and files under `/data/` revalidate hourly so a
redeploy is picked up without a hard refresh.

`public/_redirects` carries the same SPA rule as a fallback. It is redundant
alongside `not_found_handling` but harmless, and it keeps the project portable
to the Pages workflow unchanged.

The Content-Security-Policy allows only this origin plus Google Fonts. There is
no `connect-src` beyond `'self'`, because the site makes no third-party requests
at runtime.

## Custom domain

**Workers & Pages → respira-atlas → Domains → Add → Custom domain.**

Enter the subdomain (for example `atlas.example.org`). When the zone is already
on Cloudflare, the required DNS record is created automatically and the
certificate is issued within a few minutes. **Do not create the DNS record by
hand first** — adding the custom domain through the dashboard creates and
manages it, and a pre-existing record can leave the subdomain pointing nowhere.

## Asset paths

Assets are referenced relatively from the site root, and data files are fetched
from `${import.meta.env.BASE_URL}data/...`. The site therefore works at a domain
root without configuration. To serve it from a sub-path instead, set Vite's
`base` option and rebuild.

## Checks before going live

- `npm run build` succeeds.
- `npm test` — 74 unit tests.
- `npm run smoke` — 21 browser tests against the production build, including the
  SPA fallback and every download path.
- `npm run data:validate` — the committed dataset is internally consistent.
- `npx wrangler deploy --dry-run` — the deploy config resolves and the expected
  number of assets is found.

## What is deliberately absent

- No Worker script, no Pages Functions, no server-side code of any kind.
- No API keys, tokens or runtime secrets.
- No third-party CORS proxy.
- No runtime calls to Fingertips or the ONS portal. Those are build-time only,
  in `scripts/prepare-data`, and are not part of the deployed site.

## Using the legacy Pages workflow instead

The repository is compatible with it unchanged. Create a Pages project, connect
the repository, and set:

| Setting | Value |
|---|---|
| Framework preset | None (or Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |

`public/_redirects` supplies the SPA fallback there, and `wrangler.jsonc` is
ignored.
