# Visual design specification

The rules every chart in the atlas follows, so that a new figure looks and
behaves like the existing ones and keeps the atlas's honesty rules. Where a rule
lives in code, the file is named; change the code and this page together.

One rule sits above the rest: **a figure may not imply more precision, causation
or coverage than the source supports.** Caveats are drawn where they can be
(bands, whiskers, hollow marks, axis breaks, gaps), and written only where
drawing cannot carry them.

---

## 1. Colour roles

Colour has a fixed job. A hue that means "your selected area" in one view never
means anything else in another. Tokens: `src/charts/palette.ts`.

| Role | Token | Value | Used for |
|---|---|---|---|
| Value, sequential | `SEQUENTIAL_OXFORD` (5) / `_7` | `#dde7f1` → `#002147` | Choropleth classes. Single hue, monotonic lightness: survives greyscale and all common colour-vision deficiencies. |
| Value, diverging | `DIVERGING_BRASS_OXFORD` | `#8a5f17` … `#eeeeec` … `#002147` | Difference from England. Brass low, Oxford high, neutral centre. Never red/green, and never "good/bad" by hue. |
| Your selected area | `SELECTION.stroke` | `#a9791f` brass | Map outline, trend line, ranking dot and whisker, row wash `#f6eedf`. Text in brass uses `SELECTION.text` `#7a5414` (4.5:1 on white). |
| Compared areas | `SELECTION.comparisonStrokes[1..3]` | teal `#0f766e`, purple `#86198f`, rust `#9a3412` | Map outline, trend line, ranking mark, in the order the areas were added. |
| England benchmark | `CHART_INK.benchmark` | `#3f3c39` charcoal, **dashed** | Reference line on trends and rankings. Deliberately not brass. |
| Other areas | `CHART_INK.series` | `#002147` | Unselected rows in rankings. |
| Ink | `CHART_INK.text` / `mutedText` / `axis` / `grid` | `#001734` / `#585551` / `#6b6864` / `#e7e5e1` | Text, secondary text, tick labels, gridlines. |

**One ordering everywhere.** `selectionOrder(selected, compared)` puts the
selected area first and the compared areas after it, never repeating the selected
one; `selectionColour(i)` maps a position to its colour. The map view model, the
trend and the ranking all use it, so one place always has one colour.

**Non-data states** (`NON_DATA_STYLES`) sit outside both ramps and are never
mistaken for a value, however pale:

| State | Fill | Pattern | Meaning |
|---|---|---|---|
| No value published | `#f0efed` | none | Geography published, no number for it. |
| Suppressed | `#e3e1dd` | vertical hatch | Withheld under disclosure control. |
| Not covered by this dataset | `#f8f8f7` | diagonal hatch | Nation outside the dataset's coverage. |
| Not applicable | `#ffffff` | none | The measure does not exist here. |

## 2. Type scale

Charts are SVG strings built without a DOM, in IBM Plex Sans
(`src/export/figure-spec.ts`, `TEXT_SCALES`):

| Scale | Title | Body | Small (ticks, keys, notes) |
|---|---|---|---|
| compact | 14 | 10.5 | 9 |
| standard (screen) | 17 | 12 | 10 |
| large (slides) | 21 | 14.5 | 12 |

- Titles are questions ("How has … changed in Sheffield?"), never conclusions.
- Numbers use tabular figures and the indicator's own precision (`formatValue`).
  Tick labels use only the precision the tick step needs ("80", not "80.0").
- Width is estimated at 0.56 em per character (`textWidth`). Labels that would
  not fit are truncated with an ellipsis (`truncateToWidth`); the full name is
  always in the accessible description and the data table.

## 3. Axes and labels

- **No rotated text, anywhere.** The unit sits horizontally above the value axis
  ("per 100,000", "years"). Period labels are horizontal.
- **Thin, don't rotate.** Every period gets a tick; labels are placed greedily on
  their real extents (anchor included) with a 12 px gap, and the last period is
  always labelled. Pooled periods print as `2021–23`.
- **Direct labels, not legends.** Lines end in `Name value`, coloured to the line
  and spread vertically so they never overlap; a faint leader connects a label
  that had to move. A legend appears only for marks that are not lines
  (interval, flag glyphs, gap), and it is drawn as the marks themselves.
- **Gridlines** are light (`#e7e5e1`); a zero line, when present, is darker.
- Dot-and-interval charts thin x ticks by label width, so labels can never touch.

## 4. Per-indicator axis rules

Whether a value axis starts at zero is a property of the measure, not a user
toggle (`src/charts/axis-rules.ts`):

| Publisher value type | Baseline | Why |
|---|---|---|
| Directly standardised rate, Crude rate | zero | A rate is a count per population; truncating the axis makes modest change look dramatic. |
| Proportion | zero | Zero means none; magnitude is part of the message. |
| Mean (e.g. PM2.5 µg/m³), Count | zero | Physical quantity or count with a true zero. |
| Life expectancy, Healthy life expectancy | **fitted** | No meaningful zero for a population; a zero axis flattens a one-year change, which is large. |
| Score (e.g. IMD) | **fitted** | An index has no natural zero. |
| anything else | zero | The conservative default. |

A fitted axis:

1. is padded by 8% and snapped outward to nice ticks;
2. never shows less than a minimum span (2% of the level for life expectancy,
   10% for scores), so a flat series is not magnified until noise looks like a
   cliff;
3. is **always marked**: two slashes cut the baseline, and the unit line reads
   "years · axis starts at 79, not zero". The same sentence goes into the SVG
   description.

To change one indicator, add it to `BY_INDICATOR_ID` with a reason. Do not
special-case a chart.

Dot-and-interval charts compare positions on one common scale, so they use a
fitted domain without a break marker. Bars, if any are ever added, must start at
zero.

## 5. Uncertainty encoding

| Where | Encoding |
|---|---|
| Trend lines | The published 95% interval as a band in the line's colour (16% opacity; England 10%). The selected area and England get bands; extra compared areas are lines only, so up to five series stay readable. |
| Rankings | A whisker with end caps for the 95% interval. A row with no published interval says "(no interval)" beside the value: it is never a bare, falsely precise dot. |
| Comparison with England | **The publisher's own flag**, drawn as the mark's fill: solid = flagged different, hollow = flagged similar, short bar = not compared. This works without colour. The atlas never computes its own significance and never treats interval overlap as a test. |
| Flag level | Whiskers next to a flag are drawn at **the level the flag follows**, read from the data (`flag-level.ts`): 99.8% for hypertension, depression and asthma prevalence (219, 848, 90933), and 95% elsewhere. The key names the level, so bar and dot always agree. The area detail panel draws both intervals (thin 99.8% line, thick 95% bar) against England, so "similar" beside a 95% bar that misses England explains itself. |
| Pooled periods | Axis note: "Rolling 3-year pooled periods — neighbouring points share years of data". Pooled and single-year series are never on one line. |
| Gaps | A missing period breaks the line; an isolated value is a dot. The gap key ("Break in a line: no published value (not zero)") appears only when a line actually has a gap, and its glyph (two round-ended segments) cannot be mistaken for a dashed line. |
| Ranks | "Rank of 151" heads the column; 1 is the highest value. Ties share a rank. The subtitle says "Rank 1 is the highest value, not the best". |

## 6. Linked selection

Selecting an area anywhere — search, map click, ranking row, chart row button or
data table — sets `selectedAreaCode`, and every view responds:

- **Map:** brass outline, raised above its neighbours; tooltip gives value, CI,
  period and rank.
- **Trend:** the area's line and CI band, drawn on top, next to England's dashed
  line and band.
- **Ranking:** defaults to "Around [area]", the area and its five nearest
  neighbours in value on each side, with the row washed in brass. The other views
  are "Highest and lowest" (the area is inserted at its true rank, with drawn
  breaks for skipped ranks) and "Compared".

The ranking view is part of the URL state (`rk`), so a shared link reproduces it.

## 7. Map framing

The map fits the nations the dataset covers. Uncovered nations are drawn on a
separate amCharts series with `affectsBounds: false`: they are faint context
that stays hoverable and selectable, but they never shrink the frame. A locator
inset (top left; the amCharts attribution stays bottom left) shows the UK with
the covered nation in blue and says in one line which nations are missing and
that this is a coverage gap, not low values. The SVG export uses the same fit and
clips context areas at the frame.

## 8. Show it, then say it

Every view leads with graphics, and text is one click away. A new view follows
the same order:

| Instead of | Use | Component |
|---|---|---|
| A metadata paragraph (population, period, geography, unit, source) | Icon chips, truncated with the full value on hover | `FigureFrame` meta chips |
| A limitation paragraph | 2–4 caveat chips, always visible, one icon per kind (coverage, not-causal, pooled, gaps, interval, rank, recording, areas, test), with "Why?" opening the full text | `CaveatChips`, `FigureFrame` `caveats` |
| "The interval does not include England…" | A strip: the interval(s), England's line, the flag as a solid or hollow dot | `IntervalVsEngland` |
| "That is 6.40 per 100,000 higher…" | A stat tile: arrow, signed number, unit small, relative difference below | `DifferenceTile` |
| "Compared with 2022–24…" | A change tile against the latest period that shares no years with this one (three steps back for 3-year pooled series), plus the publisher's trend as an icon | `ChangeTile` |
| A trend sentence | A sparkline of the area against England, on the indicator's axis rule | `Sparkline` |
| Counts in a list | Count tiles with the swatch of the state they count | Explore empty state |
| Control helper paragraphs | An "About this" toggle; only a warning the reader must act on stays visible, as a chip | `Hint` in `Controls` |

Rules that keep this honest:

- Caveats are never removed, only shortened. The full text stays in the page:
  it is read by screen readers, printed, and carried in exports.
- A chip says what to keep in mind, never a conclusion ("Pattern, not cause",
  not "No link").
- Better/worse wording in graphics goes through the same recorded-prevalence
  guard as the written statement.

## 9. Narrative views: flow, infographics and motion

Stories, Explain and Briefing use a shared kit (`src/components/infographics`,
`src/components/motion`):

| Piece | Use it for |
|---|---|
| `FlowSteps` | A reading order drawn as a path: numbered nodes, a connector that draws itself. Explain opens with Observed → vs England → Evidence → Over time. |
| `StatCallouts` | One to three numbers that matter, counting up as they appear; the key one in brass. |
| `Waffle` | A count and a share at once: one square per area, styled by state (hollow = similar to England, solid = different, hatched = suppressed, pale = not covered). |
| `RangeBar` | Lowest, median and highest on one track, with the ratio between the ends. |
| `ContrastCards` | "This shows / It does not show", side by side. |
| `IconCards` | Lists of caveats or questions: first sentence as the headline, the rest beneath. |
| `LayoutThumb`, `DownloadTile` | The briefing composer: choose by looking, download by icon. |

Rules:

- **Graphics carry computed numbers only.** A story step's `graphic` is built in
  the same `build()` call, from the same values, as its prose, so the two cannot
  disagree. No graphic contains an authored number.
- **Prose stays in the page.** Step explanations and the full statement sit
  behind "Read the explanation" or "Full written statement". When closed they
  are visually hidden, not removed, so screen readers, print and tests still
  read them.
- **Motion is for orientation, never decoration of a value.** Elements reveal
  on scroll (`Reveal`), numbers count up (`CountUp`, whose final value is always
  in the page as text), waffle cells pop in, bars grow and connectors draw.
  Everything is shown in its final state under `prefers-reduced-motion` and in
  print.
- **The story step tracker** follows scroll position in both directions and is
  hidden in print.
- **"Change" compares non-overlapping periods.** In a rolling 3-year series it
  compares with the period three steps back. The written statement and the
  change tile use the same rule.

### Start, Coverage and Methods

- **Start:** a hero with count-up stats and a coverage map drawn from the nations
  layer (`CoverageMap`: covered nation filled, the rest hatched). Topics are a bar
  chart of indicators per topic, questions a card grid, and recent uploads a
  timeline (upload date ≠ data period, said in a chip).
- **Coverage:** summary callouts, one tile per nation (England solid, other
  nations hatched at zero) that doubles as the filter, the legend as chips, and
  the matrix grouped by topic. It shows the covered nation by default.
- **Methods:** six principles as icons above the tabs, then a claim-ladder
  staircase, swatch cards for the four no-value states (drawn with the map's own
  styles), a two-tree geography diagram, and `RuleGrid` cards for every rule.

## 10. Page shell

Header, navigation, every view and the footer share one centred column, the
`.shell` class in `globals.css`: 84rem wide, with 16, 24 or 40 px gutters by
screen size. Change the width there, not per view. The site title links home
(Start here). The footer is one line, with independence and licensing details
behind "Licensing & independence".

## 11. Accessibility checklist for a new chart

- Text contrast is at least 4.5:1 on white, and marks at least 3:1. Brass text
  uses `SELECTION.text`.
- Meaning never relies on colour alone: selection is outline plus wash plus bold;
  flags are fill versus hollow; the benchmark is dashed.
- Every chart has a text alternative listing its values (`accessibleDescription`)
  and a keyboard route to every selection the pointer offers.
- Screen and export come from one renderer (`src/export/chart-svg.ts`), so the
  download is the chart that was read.
