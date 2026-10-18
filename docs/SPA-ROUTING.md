# SPA routing on Cloudflare

All analytical state lives in the query string, so the application has exactly
one HTML entry point and every path must resolve to `index.html` **without
changing the URL** — a redirect would rewrite a shared deep link such as
`/?v=explain&g=nhs&i=93577&a=E54000008` and lose the view it encodes.

How that is achieved depends on which Cloudflare product serves the site.

## Workers Static Assets (what this project uses)

`wrangler.jsonc`:

```jsonc
"assets": {
  "directory": "./dist",
  "not_found_handling": "single-page-application"
}
```

This serves `index.html` with a **200** for any path that is not a real asset.

### Why there is no `_redirects` file

This project originally shipped a `public/_redirects` containing the Pages-style
rule:

```
/*  /index.html  200
```

That is **invalid on Workers Static Assets** and fails the deploy with
`Invalid _redirects configuration`. The `_redirects` file is supported there,
but only for genuine redirects — status codes 301, 302, 303, 307 and 308. A
`200` rewrite is a Cloudflare Pages feature and has no equivalent in the
Workers `_redirects` syntax, because `not_found_handling` is the mechanism for
it instead.

Shipping both is therefore not merely redundant, it breaks the deploy. The file
was removed and `not_found_handling` is the single source of this behaviour.

## Cloudflare Pages (the legacy workflow)

Pages has no `not_found_handling` setting and uses the `_redirects` file. To
deploy this project to Pages instead, add `public/_redirects` containing:

```
/*  /index.html  200
```

`wrangler.jsonc` is ignored by Pages, so the two can coexist in a fork that
targets Pages.

## Verifying it

`npm run smoke` includes a check that a deep link returns 200 with the
application shell rather than a 404. That test runs against `vite preview`,
which has its own SPA fallback, so it verifies the application tolerates deep
links — it does **not** verify the Cloudflare configuration. Confirm that
against the deployed site:

```bash
curl -sI https://<your-domain>/some/deep/link | head -1   # expect HTTP/2 200
```
