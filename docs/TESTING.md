# Testing

All results below were produced by running the suites on the committed tree.
Reproduce with `npm test`, `npm run smoke` and `npm run data:validate`.

## What is covered

**Unit tests** (`tests/unit/`, Vitest) cover the pure analytical layer — the
code shared by the interface, the evidence stories and the exports:
classification and breakpoints, benchmark comparison, the comparability gate,
the missing/suppressed/zero distinction, evidence-statement eligibility, URL
round trips, columnar decode integrity, SVG export content, and the story
computations.

**Browser tests** (`tests/smoke/`, Playwright) run against the **production
build** served by `vite preview`, exercising the same bundle, asset paths and
SPA fallback Cloudflare serves. Any console error fails the run.

## Results

### Unit tests

```
      Tests  94 passed (94)
   Start at  15:33:21
   Duration  938ms (transform 524ms, setup 0ms, collect 932ms, tests 264ms, environment 1ms, prepare 391ms)

```

### Browser smoke tests

```
--- browser smoke tests ---
  PASS  a bare URL opens discovery, driven by real metadata — discovery renders
  PASS  the coverage statement names the real sources — accurate
  PASS  a topic entry point opens the workspace on that topic — cardiovascular
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
  PASS  a measure with no combined figure says so and offers the choice — population choice required and explained
  PASS  an indicator unavailable at this geography is disabled, with a reason — 7 disabled with reasons
  PASS  evidence stories compute their figures from the data — range and 135 compared areas, computed
  PASS  a story figure exports genuine vector SVG — 218 paths
  PASS  a story that loses its data says so instead of rendering — guarded and explained
  PASS  SVG download works and contains real vector content — 219 paths, 24 text nodes
  PASS  PNG download works and is a real raster — 839 kB
  PASS  CSV download works and states availability per row — 153 rows
  PASS  figure specification JSON downloads and is reproducible — 218 areas, 4 breaks
  PASS  coverage matrix renders every status — all statuses documented
  PASS  methods view documents the statistical rules — interpretation and statistics rules documented
  PASS  print briefing is legible in print layout — print layout hides interface chrome
  PASS  a failed data load shows a recoverable error — error state with retry
  PASS  SPA fallback serves a deep link — index.html served
  PASS  no console errors during the run — clean

29/29 browser smoke tests passed.
```

### Data validation

```
  checked 35 indicators, 3 geographies, 420 coverage rows, 206 search entries
  OK — no violations
```

## Notable behaviours pinned by tests

- A published value of **zero** is counted as present, never as missing, in both
  the decoder and the story computations.
- A range summary returns a **null ratio** against a zero minimum rather than
  reporting infinity.
- Two measures that share **no period** cannot be paired for a scatter.
- Story prose is checked for **internal consistency**, not just presence: the
  computed maximum must exceed the minimum, and the number of areas reported
  indistinguishable cannot exceed the number compared.
- A story figure's exported SVG must contain real vector paths and its licence
  note, and no raster.

## Not covered by automated tests

- Formal third-party accessibility audit. Keyboard operation, focus visibility,
  non-colour cues, screen-reader announcements and reduced motion were built in
  and checked, but no external audit has been run.
- Cross-browser testing beyond Chromium.
- Visual regression testing of figure layout.
