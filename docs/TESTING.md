# Testing

All results below were produced by running the suites on the committed tree.
Reproduce with `npm test`, `npm run smoke` and `npm run data:validate`.

## What is covered

**Unit tests** (`tests/unit/`, Vitest, Node environment) cover the pure
analytical layer — the code shared by the interface and by exports:

- **Classification** — class counts and explicit boundaries, every value landing
  in exactly one class, equal-interval spacing, missing and suppressed
  observations excluded from the scale, fixed boundaries recorded as an external
  scale, graceful collapse when the data hold fewer distinct values than classes.
- **Comparison** — the comparability gate (period, geography, boundary vintage,
  period pooling, subgroup), absolute and percentage-point differences,
  suppression of percentage points for rate measures, refusal of a relative
  difference against a zero benchmark, zero treated as a real value, interval
  containment reported without being treated as a test, pass-through of the
  publisher's significance flag, ranking that excludes areas without values.
- **Evidence statements** — unit, period and measure type present; relative
  difference labelled as relative; interval quoted with the "not a formal
  hypothesis test" caveat; absence of a trend clause without a valid earlier
  observation; a two-point change never called a trend; pooled periods flagged
  as non-independent; small-count warnings; the recorded-prevalence guard
  refusing to repeat a better/worse flag; suppression distinguished from a low
  value; missing distinguished from zero; an out-of-coverage nation explained as
  a coverage gap; full provenance; causal limits always present.
- **URL state** — full round trip of every field, stability across repeated
  trips, defaults kept out of the query string, and rejection of invalid modes,
  indicator IDs, area codes and class counts without inventing a selection.
- **Columnar decoding** — exact row reconstruction, zero preserved as a present
  value, no `value` property on non-present rows, suppression notes preserved,
  intervals and flags preserved, an omitted column decoding as `null` rather
  than `0`, and rejection of schema drift, non-finite present values and
  dangling dictionary references.
- **SVG export** — real vector paths and live text, no `<image>`, no base64
  raster, no `<foreignObject>`, every mandatory note present, white background,
  user-authored headlines labelled as such, the out-of-coverage hatch pattern
  present, text scales honoured, plot-only composition omitting notes, and
  well-formed XML with balanced tags and an accessible title and description.

**Browser tests** (`tests/smoke/`, Playwright) run against the **production
build** served by `vite preview`, exercising the same bundle, asset paths and
SPA fallback Cloudflare Pages will serve. Any console error fails the run.

## Results

### Unit tests

```
      Tests  74 passed (74)
   Start at  13:50:31
   Duration  917ms (transform 460ms, setup 0ms, collect 783ms, tests 256ms, environment 1ms, prepare 325ms)

```

### Browser smoke tests

```
--- browser smoke tests ---
  PASS  UK overview renders a UK-only map, with no world basemap — 65 areas outside coverage, drawn not blank
  PASS  all four UK nations are present in the boundary data — England, Northern Ireland, Scotland, Wales
  PASS  unsupported nations stay visibly unsupported, never zero — stated
  PASS  a verified city search resolves transparently — authority and settlement offered separately; notice shown
  PASS  selecting an area updates the detail panel and the URL — E08000019
  PASS  a shared URL restores the exact view — NHS mode, equal interval, ICB selected
  PASS  NHS and administrative modes are not a parent/child hierarchy — stated
  PASS  nation and area drill-down with Back works — back cleared the selection
  PASS  a keyboard user can select an area from the linked table — Enter on a focused row selected it
  PASS  the data table distinguishes availability from zero — stated
  PASS  area comparison uses compatible observations only — compared
  PASS  SVG download works and contains real vector content — 219 paths, 26 text nodes
  PASS  PNG download works and is a real raster — 861 kB
  PASS  CSV download works and states availability per row — 153 rows
  PASS  figure specification JSON downloads and is reproducible — 218 areas, 4 breaks
  PASS  coverage matrix renders every status — all statuses documented
  PASS  methods view documents the statistical rules — interpretation and statistics rules documented
  PASS  print briefing is legible in print layout — print layout hides interface chrome
  PASS  a failed data load shows a recoverable error — error state with retry
  PASS  SPA fallback serves a deep link — index.html served
  PASS  no console errors during the run — clean

21/21 browser smoke tests passed.
```

### Data validation

```
  note: 3 declared-but-empty source combination(s) recorded
  checked 14 indicators, 3 geographies, 168 coverage rows, 206 search entries
  OK — no violations
```

## Production build

```
dist/index.html                     1.26 kB │ gzip:   0.60 kB
dist/assets/index-*.css            29.74 kB │ gzip:   6.17 kB
dist/assets/geo-*.js               28.84 kB │ gzip:  11.11 kB
dist/assets/index-*.js            173.59 kB │ gzip:  50.62 kB
dist/assets/amcharts-*.js         313.88 kB │ gzip:  84.82 kB
dist/assets/vendor-*.js           329.58 kB │ gzip: 102.60 kB
```

amCharts, the geographic projection code and the remaining vendor code are split
into separate chunks so the map engine is not in the critical path for the
Methods or Coverage views.

## Checked manually in a browser

- The UK fits the initial viewport including Northern Ireland and the Scottish
  islands, with no world basemap or globe.
- Selecting an area updates map, detail panel, charts, table and URL together.
- The export preview shows the file that downloads, from the same renderer.
- A PNG rasterised from the vector figure measured 2700 × 3540 at 3× and
  990 kB, from an SVG holding 219 vector paths and 26 text nodes with no raster.
- The scatter view refuses to plot PM2.5 against pooled mortality because the
  periods differ, and plots 152 points once both sit in the single-year series.
- Place search offers "Sheffield" as both an authority and a settlement, and
  selecting the settlement shows the "not a city-only estimate" notice.

## Not covered by automated tests

- Formal third-party accessibility audit. Keyboard operation, focus visibility,
  non-colour cues, screen-reader announcements and reduced motion were built in
  and checked, but no external audit has been run.
- Cross-browser testing beyond Chromium.
- Visual regression testing of figure layout.
- Performance profiling under throttled networks.
