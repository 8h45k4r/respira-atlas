# UK Respiratory Health Evidence Atlas

**Place-based evidence for respiratory health research and public decisions.**

An interactive, research-grade atlas of respiratory health indicators for the
UK. It is built for people who have to defend a claim: NHS analysts,
public-health researchers, local-authority teams and anyone who needs to say
something accurate about geographic variation and be able to show their working.

It answers a narrow set of questions honestly rather than a wide set vaguely:

- Where is respiratory disease burden higher or lower?
- How does a place compare with an appropriate benchmark?
- Is the apparent difference supported by the published uncertainty?
- How has the measure changed over time?
- What can be responsibly communicated from this?
- What is missing before anyone recommends an intervention?

> An independent research tool, built and maintained by a named team (see
> **Methods → Team**). Their institutional affiliations identify them; they do
> **not** mean any institution has reviewed, endorsed or funded this atlas. It
> carries no endorsement from the NHS, OHID or the ONS.

---

## What makes this different from a dashboard

The hard part of a map like this is not drawing it. It is not lying with it.

**Four states, never three.** A value of `0` is a value. "No value published",
"suppressed by the publisher", "not covered by this dataset" and "not
applicable" are four different things, styled differently, explained
differently, and kept apart in the type system — a non-present observation has
no `value` property at all, so it cannot be read by mistake.

**Coverage is admitted, not hidden.** The data source (OHID Fingertips INHALE)
publishes **England only**. All four UK nations stay on the map and remain
navigable, but Scotland, Wales and Northern Ireland are drawn as *not covered by
this dataset* — never as zero, never as a low value. No UK-wide benchmark is
computed anywhere, and the England-only label travels with every figure and
every export.

**Availability is discovered, not assumed.** Coverage is probed per indicator
per geography from the source's own `available_data` endpoint and then
*verified by actually fetching the data*. One indicator in this release
(fuel poverty) is declared available at eight geographies and returns no rows at
any of them; it is excluded, and the discrepancy is recorded in the coverage
view rather than quietly dropped.

**Pooled periods are not annual observations.** Several indicators publish a
rolling 3-year pooled series *and* a single-year series under one indicator ID,
interleaved in the same response. They are separated into distinct series and
never drawn on one line.

**Claims are gated.** Evidence statements are generated from deterministic
templates — no language model, at build time or runtime. A clause is emitted
only when its eligibility test passes, so the statement gets *shorter* when the
data are weaker, not more confident. A two-point change is never called a trend.
Recorded prevalence is never called disease prevalence. Overlapping confidence
intervals are never treated as a significance test.

**Exports are real.** The SVG export contains genuine vector paths and live
text, verified by test — not a PNG in an SVG wrapper, and not a screenshot of
the screen.

---

## The three modes

**Explore places** — a map-led workspace. Choropleth, linked detail panel,
trend, dot-and-whisker comparison, inequality breakdown, exposure/outcome
scatter, and a fully keyboard-operable data table that does everything the map
does.

**Explain a finding** — turns one selection into a defensible statement:
descriptive headline, annotated map, comparison, interpretation, uncertainty,
provenance, and the questions that remain open. Includes an explicit panel on
what the figure *cannot* tell you.

**Prepare a briefing** — a publication composer. Single map, single chart, map
plus comparison, a print-ready A4 evidence brief, a presentation slide, and
editable conceptual diagrams. Exports to vector SVG, high-resolution PNG,
filtered CSV, and a JSON figure specification for reproducibility.

Plus **Coverage** (the indicator × nation × geography matrix) and **Methods**
(definitions, statistical rules, and the limits of the evidence).

---

## Data

| | |
|---|---|
| Indicators | **14**, all real, resolved from source metadata |
| Source | OHID Fingertips, respiratory disease ("INHALE") profile, ID 29 |
| Coverage | **England only** — by the source's nature, not by choice |
| Geographies | 153 upper-tier local authorities · 42 ICBs · 7 NHS England regions |
| Boundaries | ONS Open Geography Portal, 218 UK counties and unitary authorities, 4 UK nations |
| Benchmark | England (the publisher's own England row, never a mean of local values) |
| Settlements | 8,545 built-up areas for place search, each resolved to its containing area |

Indicators cover COPD, asthma, respiratory mortality, emergency admissions,
pneumonia, childhood outcomes (bronchiolitis, childhood asthma), smoking
prevalence and PM2.5 air pollution. Every one keeps its full published metadata:
definition, numerator and denominator, method, standard population, confidence
interval method, disclosure control, caveats, licence and retrieval date.

Details, including the boundary-vintage trap this release had to solve, are in
[docs/DATA.md](docs/DATA.md).

---

## Running it

```bash
npm install
npm run dev
```

The prepared dataset is committed, so the app runs offline with no API access.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm test` | 74 unit tests |
| `npm run smoke` | 21 browser tests against the production build |
| `npm run data:validate` | Checks the committed dataset for violations |
| `npm run data:prepare` | Re-fetches everything from source (~3 minutes) |

### Tests actually executed

All of the following were run and passed on the committed tree:

- **74 unit tests** — classification and breakpoints, benchmark comparison,
  comparability gating, the missing/suppressed/zero distinction, evidence-statement
  eligibility, URL round trips, columnar decode integrity, and SVG export content.
- **21 browser tests** — UK-only map, all four nations present, out-of-coverage
  nations visibly unsupported, city search disambiguation, drill-down and Back,
  shared-URL restoration, keyboard area selection, NHS/administrative
  independence, compatible comparison, SVG/PNG/CSV/JSON downloads (including an
  assertion that the SVG holds real vector paths and no raster), print briefing,
  recoverable load failure, SPA fallback, and zero console errors.
- **Data validation** — 14 indicators, 3 geographies, 168 coverage rows,
  206 area entries, no violations.

See [docs/TESTING.md](docs/TESTING.md) for the output.

---

## Deploying

Static site on Cloudflare. Build command `npm run build`, assets served from
`dist` via Workers Static Assets (`wrangler.jsonc`), with SPA routing handled by
`not_found_handling: "single-page-application"` so shared deep links keep their
URL. There is no Worker script, no backend and no runtime secret — nothing runs
server-side. The legacy Pages workflow also works unchanged. Full instructions
in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Stack

React 18 · TypeScript (strict) · Vite 6 · Tailwind CSS 3 · Radix UI primitives ·
amCharts 5.21.2 (interactive map) · d3-geo (export projection) · Zod (runtime
schema validation). All dependencies pinned to exact versions.

Interactive maps use amCharts under its free licence, which requires the
attribution link that is present on the map and has not been removed. No licence
key is inserted. Exported figures come from this application's own SVG renderer.

---

## Documentation

- [Implementation plan and verified assumptions](docs/IMPLEMENTATION-PLAN.md) — what was checked against live sources before any code was written
- [Data sources and preparation](docs/DATA.md)
- [Methods and statistical rules](docs/METHODS.md)
- [Known limitations and unsupported coverage](docs/LIMITATIONS.md)
- [Licensing and attribution](docs/LICENSING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [SPA routing on Cloudflare](docs/SPA-ROUTING.md)
- [Testing](docs/TESTING.md)

## Licence

Application code: MIT (see [LICENSE](LICENSE)).

Data and boundaries remain the property of their publishers and are used under
the Open Government Licence v3.0. See [docs/LICENSING.md](docs/LICENSING.md).
