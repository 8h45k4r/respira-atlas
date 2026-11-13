# Public Health Evidence Atlas

**Understand health across people, places, and time.**

An interactive, research-grade atlas of public health indicators for England,
shown on a UK map. It is built for people who have to defend a claim: NHS
analysts, public-health researchers, local-authority teams and anyone who needs
to say something accurate about health across people, places and time, and be
able to show their working.

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

**Coverage is admitted, not hidden.** The data source (OHID Fingertips, five
profiles) publishes **England only**. All four UK nations stay on the map and remain
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

**Uncertainty is drawn at the level the publisher used.** The publisher's
England flag is shown as the mark itself (solid = different, hollow = similar),
and the interval beside it is the one the flag follows: 99.8% for hypertension,
depression and asthma prevalence, 95% elsewhere. The level is read from the
data, so bar and dot can never contradict each other.

**Axes follow the measure.** Rates and proportions start at zero; life
expectancy and scores get a fitted axis with a drawn break and the words "axis
starts at 79, not zero". It is a rule per indicator, not a toggle.

**Show it, then say it.** Every view leads with graphics — chips, tiles,
waffles, range bars, a claim-ladder staircase — and keeps the full written
caveats one click away, in the page for screen readers and print.

**Exports are real.** The SVG export contains genuine vector paths and live
text, verified by test — not a PNG in an SVG wrapper, and not a screenshot of
the screen.

---

## The views

**Start here** — count-up headline figures, a coverage map drawn from the
nations layer (England filled, other nations hatched as not covered), four ways
in, a bar chart of indicators per topic, starting questions as cards and a
timeline of the source's latest uploads. Every question, date and count is read
from the prepared dataset.

**Explore places** — a map-led workspace, fitted to England. One selection
drives every view: the map outline, the trend line with its confidence band
beside England, and a ranking around the selected area (ranks, flag glyphs,
clickable rows). The detail panel is a visual card — interval strip against
England, "vs England" and "change" tiles, a sparkline and caveat chips — with
the full written statement one click away. A keyboard-operable data table does
everything the map does.

**Evidence stories** — four questions worked end to end. Each step leads with a
computed graphic (a range bar, a waffle of the publisher's flags, count-up
callouts, is / is-not cards), with a sticky step tracker and the prose behind
"Read the explanation". **Every number is computed from the observations when
the page renders**; a story whose computation cannot be satisfied reports itself
unavailable.

**Explain a finding** — one selection as a four-step flow (observed → vs England
→ evidence → over time), then the annotated map, nearest neighbours in value,
the trend, "how big?" and "real?" as separate tiles, and what the figure *cannot*
tell you.

**Prepare a briefing** — a publication composer: layouts picked from thumbnails,
text size from an A/A/A switch, downloads as tiles (vector SVG, 3× PNG, CSV,
JSON figure specification, print). The A4 brief opens with a key-figures band and
carries the mandatory notes once.

**Coverage** — nation tiles, summary counts and the indicator × geography matrix
grouped by topic. **Methods** — principles, a claim-ladder staircase, the four
no-value states as swatches, a diagram of the two geographies, and every rule as
a card.

Motion (reveal on scroll, count-up, waffles, connectors) is switched off under
`prefers-reduced-motion` and in print.

---

## Data

| | |
|---|---|
| Indicators | **35**, all real, resolved from source metadata |
| Topics | **11** — Population health, Respiratory, Cardiovascular, Cancer, Mental health, Child health, Metabolic, Alcohol and drugs, Risk factors, Environment, Determinants |
| Source | OHID Fingertips, across **5 profiles**: Respiratory disease, Adult mental health and wellbeing, Child and Maternal Health, Mortality Profile, Cardiovascular Disease |
| Coverage | **England only** — by the source's nature, not by choice |
| Geographies | 153 upper-tier local authorities · 42 ICBs · 7 NHS England regions |
| Boundaries | ONS Open Geography Portal, 218 UK counties and unitary authorities, 4 UK nations |
| Benchmark | England (the publisher's own England row, never a mean of local values) |
| Settlements | 8,545 built-up areas for place search, each resolved to its containing area |

Indicators span life expectancy and all-cause mortality, respiratory disease,
cardiovascular disease, cancer, mental health, child and maternal health,
obesity, alcohol, smoking and physical inactivity, air quality and deprivation.
The respiratory collection is retained in full as a first-class topic. Every
indicator keeps its full published metadata:
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
| `npm test` | 116 unit tests |
| `npm run smoke` | 29 browser tests against the production build (see note below) |
| `npm run data:validate` | Checks the committed dataset for violations |
| `npm run data:prepare` | Re-fetches everything from source (~3 minutes) |

### Tests actually executed

All of the following were run on the committed tree. All unit tests pass. In the
latest browser run 28 of 29 passed: the "no console errors" check fails on a
single 404 that fails identically on the commit before the visual redesign, so it
is not yet traced to its source.

- **116 unit tests** — classification and breakpoints, benchmark comparison,
  comparability gating, the missing/suppressed/zero distinction, evidence-statement
  eligibility, URL round trips, columnar decode integrity, SVG export content,
  per-indicator axis rules, ranking, chart layout (no rotated text, direct
  labels, drawn axis breaks), sex-separated trend lines, and the publisher-flag
  interval level checked against the committed data.
- **29 browser tests** — discovery driven by real metadata, evidence stories computing consistent figures from the data and exporting genuine vector, an accurate
  multi-profile coverage statement, topic entry points, UK-only map, all four
  nations present, out-of-coverage nations visibly unsupported, city search
  disambiguation, drill-down and Back, shared-URL restoration, keyboard area
  selection, NHS/administrative independence, compatible comparison, a measure
  with no combined figure explaining itself, unavailable indicators disabled
  with reasons, SVG/PNG/CSV/JSON downloads (including an assertion that the SVG
  holds real vector paths and no raster), print briefing, recoverable load
  failure, SPA fallback, and zero console errors.
- **Data validation** — 35 indicators, 3 geographies, 420 coverage rows,
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

The interface is Oxford blue (#002147) with brass as its counterpart; data
colour follows the same two hues so a figure lifted into a report still reads as
part of the same publication. Both map ramps are monotonic in lightness and
carry no red/green opposition. Every page sits in one centred column (the
`.shell` class), and the visual rules are written down in
[docs/VISUAL-DESIGN.md](docs/VISUAL-DESIGN.md).

Interactive maps use amCharts under its free licence, which requires the
attribution link that is present on the map and has not been removed. No licence
key is inserted. Exported figures come from this application's own SVG renderer.

---

## Documentation

- [Implementation plan and verified assumptions](docs/IMPLEMENTATION-PLAN.md) — what was checked against live sources before any code was written
- [Data sources and preparation](docs/DATA.md)
- [Methods and statistical rules](docs/METHODS.md)
- [Visual design specification](docs/VISUAL-DESIGN.md) — colour roles, type, axis and uncertainty rules every chart follows
- [Visualisation review](docs/VISUALISATION-REVIEW.md) — prioritised issues, what was fixed, what is next
- [Evidence stories](docs/STORIES.md)
- [Known limitations and unsupported coverage](docs/LIMITATIONS.md)
- [Licensing and attribution](docs/LICENSING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [SPA routing on Cloudflare](docs/SPA-ROUTING.md)
- [Testing](docs/TESTING.md)

## Licence

Application code: MIT (see [LICENSE](LICENSE)).

Data and boundaries remain the property of their publishers and are used under
the Open Government Licence v3.0. See [docs/LICENSING.md](docs/LICENSING.md).
