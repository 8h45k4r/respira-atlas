# Methods and statistical rules

Every rule below is enforced in code, not merely described here. Where a rule is
a refusal, the application states the refusal and its reason rather than
producing a number that looks valid.

## The claim ladder

| Claim | Supported here? |
|---|---|
| **Descriptive finding** — this area's published figure was X in period P, with this interval, compared with England | **Yes.** This is the whole product. |
| **Association** — two area-level measures vary together | Shown only in the scatter view, with an ecological-inference warning, no fitted line and no correlation statistic. |
| **Hypothesis** — a possible explanation worth investigating | Appears only as an open question or a dashed arrow in a conceptual diagram, labelled as a hypothesis. |
| **Causal evidence** — X causes Y, or changing X would change Y | **No.** Nothing here can support this. |

## Rates, counts and standardisation

- Burden is compared using the rate the publisher supplies. Counts are shown
  separately and never mapped as burden.
- **Age-standardised rates are never averaged to produce a national figure.**
  The England benchmark is the publisher's own England row.
- Where a measure is a crude rate, the evidence statement says that differences
  in age structure between areas are not adjusted for.
- Incompatible measures are never aggregated.

## Uncertainty

- Confidence intervals are reproduced exactly as published, at both 95% and
  99.8% where supplied. **No interval is ever derived from a rate.**
- Significance against England uses the **publisher's own flag**. This product
  computes no significance test of its own.
- **Overlapping intervals are not treated as a significance test**, and
  non-overlap is not treated as proof of a difference. Both are reported as
  descriptions of the intervals, with that caveat attached.
- **Magnitude and evidence are reported separately.** A large difference with a
  wide interval and a small difference with a narrow interval are different
  findings, and the Explain view makes the distinction explicit.
- Small underlying counts (< 20) trigger an instability warning.

## Interpretation guards

**Recorded prevalence is not disease prevalence.** QOF register indicators
(COPD and asthma prevalence) are marked `not-interpretable`. For them the
application *refuses to repeat* the publisher's better/worse flag, and says why:
a higher recorded figure may reflect more complete case-finding rather than more
disease. Lower recorded prevalence is never called better.

**Rankings are not league tables.** Ordering areas by value is offered for
finding the ends of a distribution. Every ranked view states that adjacent areas
are usually statistically indistinguishable and that these measures reflect
need, access, case-finding and coding as well as anything resembling performance.

**No composite score.** No index, no weighting, no "respiratory health score" is
computed anywhere.

**No causal language.** Every evidence statement carries the limitation that the
observation is descriptive and area-level, and that area-level patterns do not
transfer to individuals.

## Map classification

- Default: **five-class quantile**, computed only from areas that carry a value.
- The quantile uses linear interpolation between order statistics (the "type 7"
  quantile), so breakpoints are reproducible from the published values alone.
- **Numeric breakpoints, the unit and the method are always displayed** — on the
  legend, in the figure specification, and in every export.
- Equal interval is offered as an alternative. Both are documented.
- Where the data hold fewer distinct values than requested classes, the class
  count is reduced and the reason stated rather than empty classes being drawn.
- **Class breaks can be locked across periods.** When locked they are computed
  once over the whole series, and the figure says the scale is fixed. Rescaling
  is always explicit; colours never change meaning silently.
- **Selection changes the outline only.** Selecting an area never changes what
  the fill legend means.
- Palettes are single-hue sequential (teal) or teal-to-purple diverging, with
  **no red/green opposition**. Non-data areas are styled entirely outside the
  value ramp, with patterns as well as colour.

## The four availability states

`0` is a value and is coloured on the scale. It is none of the following:

| State | Meaning | Styling |
|---|---|---|
| No value published | Geography is in the dataset; no figure supplied | Flat light grey |
| Suppressed | Withheld by the publisher, usually small numbers | Grey with vertical hatch |
| Not covered by this dataset | Nation outside the source's coverage | White with diagonal hatch |
| Not applicable | Geography type does not exist there | White |

This is enforced by the type system: a non-present observation has no `value`
property, so narrowing the state is required before a number can be read.

## Time

- **Rolling multi-year pooled periods are held as a separate series from
  single-year periods and are never plotted as independent annual observations.**
  Six indicator/geography combinations in this release publish both under one
  indicator ID, interleaved in the same response.
- Financial and calendar years are kept distinct and labelled.
- A change between two periods is described as a difference between two points,
  **never as an established trend**. Where the publisher supplies its own trend
  assessment over the full series, it is quoted as theirs and identified as such.
- **Gaps are drawn as gaps.** A period with no published value breaks the line;
  nothing is interpolated across it.
- A "latest available" mode that mixed periods across areas is not offered,
  because a same-period comparison is the only one the data support here.

## Comparability gating

A comparison requires all of: same geography type, same boundary vintage, same
period, same period pooling, same population subgroup. Any mismatch blocks the
comparison and states the reason. Examples the application actually refuses:

- A pooled 3-year estimate against a single year.
- An ICB against a local authority.
- PM2.5 in 2023 against pooled mortality for 2023–25 in the scatter — *"Pairing
  an outcome in one period with an exposure measured in another would create a
  relationship out of a mismatch, so no points are plotted."*

No crosswalk is applied between boundary vintages, and counts are never
allocated by area proportion.

## Ecological inference

The scatter view plots two area-level measures and deliberately carries **no
fitted line and no correlation coefficient**, because neither would be
interpretable as an exposure–outcome effect and a trend line invites exactly
that misreading. The warning is part of the figure, not an optional note.

## Evidence statements

Generated from deterministic templates and validated calculations. **No language
model is involved, at build time or at runtime.**

Fixed four-part structure: what was observed → how it compares → what
uncertainty remains → what further evidence would help.

A clause is emitted only when its eligibility test passes:

- A **trend clause** requires a valid earlier observation from the same period
  series.
- A **statistical comparison** requires the publisher's own flag, and is
  suppressed for measures marked not-interpretable.
- A **percentage-point difference** is emitted only for true percentage measures.
- A **relative difference** is emitted only against a non-zero benchmark, and is
  always labelled as relative.

The statement gets shorter when the data are weaker, never more confident.

Users may write their own export headline. It is always labelled on the figure
as written by the user of the atlas rather than by the data publisher, and the
mandatory source and method notes cannot be removed.

## Conceptual diagrams

Labelled as conceptual and carrying no data. Hypothesised relationships are
drawn dashed and stated as hypotheses. No arrow carries a quantified effect and
no Sankey diagram of invented patient flows exists anywhere in this product.

## Exports

- **SVG** is genuine vector: real `<path d="…">` geometry and live `<text>`.
  Verified by test to contain no `<image>`, no base64 raster and no
  `<foreignObject>`.
- The export renderer uses `am5map.geoMercator()` — the same projection function
  the interactive chart is configured with, which returns a d3-geo projection —
  fed to d3-geo's `geoPath`. Screen and file therefore agree by construction
  rather than by approximation.
- **PNG** is rasterised *from that vector figure*, not captured from the screen,
  so menus, tooltips, loading skeletons and clipped legends cannot appear in it.
- Every export carries indicator, geography, boundary vintage, population,
  period, benchmark, unit, measure type, classification method and breakpoints,
  source, publisher, retrieval date, licence, a limitation statement and the
  data version.
- White background by default; text size configurable; preview before download.

### Where interactive and export rendering differ

The interactive map is drawn by amCharts to a `<canvas>` and adds hover
tooltips, a cursor and zoom controls. The export renderer produces SVG from the
same view model — the same class breaks, colours, selection outlines and
non-data styling — and omits the interactive affordances, which are not part of
a figure. The statistical charts (trend, comparison, scatter) use the export
renderer for *both* screen and file, so those are identical by construction.
