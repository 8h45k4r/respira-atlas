# Visualisation review

A review of the atlas's charts against FT Visual Vocabulary, Our World in Data
and ONS practice, with one constraint that outranks all of them: never imply
precision, causation or coverage the source does not support. The rules that
came out of it are in [VISUAL-DESIGN.md](VISUAL-DESIGN.md).

Effort: **S** = under a day, **M** = one to three days, **L** = a week or more.

---

## Prioritised list

### Fixed in this change

| # | Issue | Why it misleads or slows the reader | Fix | Effort |
|---|---|---|---|---|
| 0 | **Trend lines mixed sexes.** Life expectancy is published only as separate Female and Male series. The trend lookup was keyed by area and period, not sex, so it held whichever row was decoded last. | A "Male" trend could show female values, or a mix of both. That is a wrong number, not a styling issue, and it reached the Explore, Explain and Briefing views. | The index is now keyed sex → area → period (`seriesFor`, `benchmarkSeriesFor`). All three views build lines through one sex-aware `buildTrendLines`. A unit test pins it. | S |
| 1 | Time-series y-axis always started at 0. | Life expectancy showed as a flat line at 80; a 2.4-year rise and a widening gap from England were invisible. | Per-indicator axis rule (`axis-rules.ts`): fitted with a drawn axis break for level measures, zero for rates, proportions and concentrations. The chart states "axis starts at 79, not zero". | S |
| 2 | Legend overlapped rotated x labels. | Series names collided with period labels, and readers had to match a legend to lines. | Direct end labels with collision avoidance, horizontal period labels thinned on real extents, and a drawn key only for non-line marks. | M |
| 3 | The map spent about half its area on three nations with no data. | England, where every value is, was drawn at roughly half size, and the hatched nations drew the eye. | Fit to covered nations; uncovered nations become a faint context layer (`affectsBounds: false`), plus a locator inset with a one-line coverage statement. The export uses the same fit. | M |
| 4 | Views were not linked. With an area selected, the ranking showed one lonely row, and the trend had no context. | The reader could not see where an area sits, or how it moved against England, without leaving the view. | One selection drives everything: map outline, trend line plus CI band beside England, and a ranking that opens "Around [area]" with its five nearest neighbours on each side. Ranking rows are clickable, and the view is saved in the URL. | M |
| 4a | England and the selected area were both brass. | The benchmark and the observation were indistinguishable on the trend. | England is charcoal and dashed everywhere; brass belongs to the reader's area. | S |
| 4b | The map and the charts numbered compared areas differently when the selected area was also in the comparison list. | The same place could be teal on the map and purple on the trend. | One `selectionOrder` and `selectionColour`, used by every view. | S |
| 4c | Ranking x-axis tick labels ran together ("82.082.282.4…"). | Unreadable scale. | Ticks thinned by label width; labels show only the precision the step needs. | S |
| 5a | Uncertainty was described in prose under the chart. | Readers skip paragraphs. | CI bands on trend lines, capped whiskers on rankings, and the publisher's England flag drawn as solid, hollow or bar marks, which work without colour. | S |
| 6a | No sense of where an area ranks. | "Is 119.6 high?" needed the data table. | Rank column ("Rank of 151", 1 = highest value, ties shared) in the ranking and in the map tooltip. | S |

### Next, in priority order

| # | Issue | Why it misleads or slows the reader | Fix | Effort |
|---|---|---|---|---|
| 5b | 95% whiskers next to a 99.8% publisher flag. For QOF prevalence (219, 848, 90933) the publisher tests at 99.8%. | A hollow ("similar") mark can sit beside a whisker that clearly misses England, which looks like a contradiction. Today only a written caveat explains it. | Record the flag's level per indicator in `prepare-data`. Draw 99.8% whiskers where the flag uses 99.8%, and label the level on the key. The evidence sentence (`evidence.ts`) has the same mismatch and should use the same level. | M |
| 7a | No "compared with England" map. This is Fingertips' default view, and what most readers want first. | Readers infer significance from colour classes, which are just quantiles. | A map mode coloured by the publisher's flag: three classes on the diverging brass–neutral–Oxford ramp ("lower", "similar", "higher"), with polarity words only where the indicator has a direction, plus a hatch for "not compared". | M |
| 10a | The trend and ranking have no data-table toggle. Only the map does. | Screen-reader and keyboard users get a long sentence instead of a table, and nobody can copy the numbers. | Reuse `FigureFrame`'s `table` slot with a generic table built from the same rows. | S |
| 9a | On a phone the map is about 520 px tall above everything else. | Long scroll before any number; pinch-zooming a choropleth is poor on touch. | Below `md`, show the ranking ("Around [area]", or Highest and lowest) first, and the map collapsed behind a "Show map" button. | M |
| 6b | No region grouping in the ranking. | Comparing with an area's own region is often the fairer question. | Add area → NHS region (or ONS region) to the prepared data; add a "Group by region" toggle with region-level England lines. | M |
| 6c | "Nearest peers" means nearest in value, not similar places. | Readers may expect statistical neighbours (CIPFA). | Fetch Fingertips' nearest-neighbour sets in `prepare-data`; add a "Similar places" view and label which definition is used. | M |
| 7b | The map is not keyboard-navigable; the data table is the keyboard route. | Keyboard users cannot explore spatially. | Enable amCharts `focusable` on polygons with arrow-key traversal in rank order; keep the table. | M |
| 7c | The legend is not a filter. | "Which areas are in the top class?" requires reading colours. | Clicking a legend class outlines its areas and filters the table; a second click clears. | M |
| 8a | No small multiples. | Male and female life expectancy, or several indicators in a topic, have to be compared one at a time. | A small-multiple trend grid using the existing renderer at compact scale with a shared y-axis rule. Sex breakdown first (S–M); topic grid next (L, as it loads several indicator files). | M/L |
| 8b | The scatter's "association, not cause" message is a paragraph under the plot. | It gets skipped. | Put a short in-plot label ("Areas, not people · association, not cause") in the plot corner, and keep the paragraph. | S |
| 11 | ICB boundaries are the July 2022 vintage. England moved from 42 to 36 ICBs on 1 April 2026. | An ICB map reads as current but shows organisations that no longer exist. | Label the layer "ICBs, July 2022 boundaries (before the April 2026 mergers)" in the subtitle and inset; add the 2026 layer when Fingertips publishes it. | S |
| 12 | The full distribution is only available as rows. | Shape (skew, outliers) is hard to see from 11 or 14 rows. | A "Whole distribution" caterpillar (rank on x, value with 95% whisker on y, England line, selected area labelled), or a funnel plot with 95% and 99.8% limits where counts are published. | M |

---

## Before and after

Screenshots were taken at 2× from production builds of the original commit and of
this change, on the same URLs.

**Trend, life expectancy, Sheffield (Female).**
Before: y-axis 0–80, both lines flat at the top, both brass, legend tangled in
35°-rotated period labels. After: fitted axis 79–84 with a drawn break and
"axis starts at 79, not zero". Sheffield is brass with its CI band, England is
charcoal dashed with its band, and each is labelled at its end. Horizontal
period labels, a pooled-period note, and a drawn CI key. The gap between
Sheffield and England, and its widening since about 2016–18, are now visible.

**Map, respiratory mortality.**
Before: the full UK, with Scotland, Wales and Northern Ireland as large hatched
shapes, and England about half the frame. After: England fills the frame, the
neighbouring nations are faint hatched edges, and a locator inset says "England
only. Northern Ireland, Scotland and Wales are not in this dataset — a coverage
gap, not low values." The tooltip now includes the area's rank.

**Ranking, respiratory mortality, Sheffield selected.**
Before: one row (Sheffield) with colliding tick labels and a truncated caveat.
After: "Around Sheffield", ranks 65–75 of 151, with Sheffield washed in brass.
England is a dashed reference line. Solid and hollow marks show which neighbours
the publisher flags as different from England. View buttons, clickable rows, and
a matching keyboard row of buttons.

**Trend and ranking with compared areas (Sheffield, Leeds, York).**
Trend: four directly labelled lines, colour-matched to the map outlines (brass,
teal, purple), England dashed. Ranking: the "Compared" view, sorted by value,
with ranks and flags.

**SVG export of the trend.** Identical to the screen, plus the mandatory notes.

**Mobile, 390 px.** The ranking reflows to full width with readable labels;
long names are truncated with an ellipsis.

## Verification

- `npm test`: 106 unit tests pass. They include new tests for the axis rule,
  ranking and ties, the neighbour window, selection order, no rotated text,
  direct labels, the axis-break statement, line breaks at gaps, flag encoding,
  clickable rows, and the sex-separation fix.
- `npm run smoke`: 28 of 29 browser tests pass. The one failure, "no console
  errors during the run" (a single 404), fails identically on the original
  commit, so it predates this change.
