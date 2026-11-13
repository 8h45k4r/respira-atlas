# Data sources and preparation

## Sources

| Source | Used for | Licence |
|---|---|---|
| [OHID Fingertips](https://fingertips.phe.org.uk/), five profiles (below) | All observations and indicator metadata | Open Government Licence v3.0 |
| [ONS Open Geography Portal](https://geoportal.statistics.gov.uk/) | Boundaries and the settlement index | Open Government Licence v3.0 |

No API key is needed by either. Neither is called at runtime: both are
build-time only, in `scripts/prepare-data`.

| Fingertips profile | ID | Key |
|---|---|---|
| Respiratory disease | 29 | `respiratory-disease` |
| Adult mental health and wellbeing | 50 | `adult-mental-health-wellbeing` |
| Child and Maternal Health | 105 | `child-health-profiles` |
| Mortality Profile | 125 | `mortality-profile` |
| Cardiovascular Disease | 135 | `cardiovascular` |

An indicator is attributed to the profile it was retrieved through. Several
measures appear in more than one profile with the same figures.

The committed dataset was prepared on **18 October 2026** (`manifest.generatedAt`)
and is marked `dataKind: "real"`.

## The indicator set

35 indicators across 11 topics, each resolved from source metadata — no ID is
invented. Geographies: **C** counties and unitary authorities (May 2023),
**I** integrated care boards (July 2022), **R** NHS England regions (July 2022).

| ID | Indicator | Topic | Unit | Geographies |
|---|---|---|---|---|
| 90366 | Life expectancy at birth | Population health | years | C, I, R |
| 93823 | Mortality rate from all causes, all ages | Population health | per 100,000 | C, I, R |
| 93721 | Under 75 mortality rate from causes considered preventable | Population health | per 100,000 | C, I, R |
| 93963 | Mortality rate from respiratory disease, all ages | Respiratory | per 100,000 | C, I, R |
| 40701 | Under 75 mortality rate from respiratory disease | Respiratory | per 100,000 | C, I, R |
| 93724 | Under 75 mortality from respiratory disease considered preventable | Respiratory | per 100,000 | C, I, R |
| 1204 | Mortality rate from COPD, all ages | Respiratory | per 100,000 | C, I, R |
| 253 | COPD: QOF prevalence | Respiratory | % | C, I, R |
| 93577 | Emergency hospital admissions for COPD, all ages | Respiratory | per 100,000 | I, R |
| 90933 | Asthma: QOF prevalence | Respiratory | % | C, I, R |
| 93573 | Emergency admissions for asthma in adults (19+) | Respiratory | per 100,000 | I, R |
| 90810 | Hospital admissions for asthma (under 19) | Respiratory | per 100,000 | C, I, R |
| 93576 | Emergency admissions for bronchiolitis (under 2) | Respiratory | per 100,000 | I, R |
| 93575 | Emergency hospital admissions for respiratory disease | Respiratory | per 100,000 | I, R |
| 93574 | Emergency hospital admissions for pneumonia | Respiratory | per 100,000 | I, R |
| 40401 | Under 75 mortality rate from cardiovascular disease | Cardiovascular | per 100,000 | C, I, R |
| 93956 | Mortality rate from cardiovascular disease, all ages | Cardiovascular | per 100,000 | C, I, R |
| 90986 | Hospital admissions due to stroke | Cardiovascular | per 100,000 | C |
| 219 | Hypertension: QOF prevalence | Cardiovascular | % | C, I, R |
| 40501 | Under 75 mortality rate from cancer | Cancer | per 100,000 | C, I, R |
| 93959 | Mortality rate from cancer, all ages | Cancer | per 100,000 | C, I, R |
| 41001 | Suicide rate | Mental health | per 100,000 | C, I, R |
| 848 | Depression: QOF prevalence | Mental health | % | C, I, R |
| 21001 | Emergency admissions for intentional self-harm | Mental health | per 100,000 | C, I, R |
| 92196 | Infant mortality rate | Child and maternal | per 1,000 | C, I, R |
| 90801 | Child mortality rate (1 to 17 years) | Child and maternal | per 100,000 | C, I, R |
| 92517 | Breastfeeding prevalence at 6 to 8 weeks | Child and maternal | % | C |
| 90323 | Year 6 prevalence of obesity (including severe obesity) | Child and maternal | % | C |
| 93881 | Obesity prevalence in adults | Obesity and metabolic | % | C |
| 91380 | Alcohol-specific mortality | Alcohol and drugs | per 100,000 | C |
| 92443 | Smoking prevalence in adults (APS) | Behavioural risk factors | % | C, I, R |
| 93015 | Physically inactive adults | Behavioural risk factors | % | C |
| 93867 | Air pollution: fine particulate matter (PM2.5) | Environment | µg/m³ | C |
| 94240 | Deprivation score (IMD 2025) | Wider determinants | score | C, I |
| 93700 | Children in relative low income families (under 16s) | Wider determinants | % | C, I, R |

Each keeps its full published metadata: definition, rationale, numerator and
denominator definitions and sources, method, standard population, confidence
interval method, disclosure control, caveats, copyright, source URL, publisher,
retrieval date and licence. The Methods view shows all of it per indicator.

### One indicator was excluded, and why

**93759, fuel poverty.** `GET /api/available_data?indicator_id=93759` declares
it at eight area types including every one this release supports. Fetching the
observations at each returns a well-formed CSV header and **zero data rows**.

Rather than trusting the declaration or silently dropping the indicator, the
pipeline verifies every declared combination by fetching it, records the
mismatch in `join-report.json` as a source discrepancy, excludes the indicator,
and surfaces the reason in the Coverage view. Availability discovered from an
index is a claim; only data that arrives is data.

## Two findings that shaped the design

### `profile_id` is required, and omitting it fails silently

`GET /api/all_data/csv/by_indicator_id` without `profile_id` returns HTTP 200
and a valid CSV header with no rows. There is no error. The pipeline therefore
treats a header-only response as a hard failure rather than as an empty result.

### Boundary vintages that match on count but not on codes

Fingertips area type 221 (ICBs) lists **42** areas. The ONS *Integrated Care
Boards April 2023* layer contains **42** features. The counts match — and the
join is still wrong: two ICBs were recoded between releases
(`E54000052`/`E54000053` became `E54000063`/`E54000064`).

The same trap exists for NHS regions: both the July 2022 and January 2024 ONS
layers hold **7** regions, but East of England and North West were recoded
(`E40000007`/`E40000010` became `E40000013`/`E40000014`).

Matching on feature count would have produced a map that renders perfectly with
two areas silently blank. The layers were therefore chosen by comparing the
**full code set** against the publisher's own area register, and the vintage
that matches exactly is the one used and recorded:

| Geography | Layer | Vintage | Features |
|---|---|---|---|
| UK nations | `Countries_December_2025_Boundaries_UK_BUC` | Dec 2025 | 4 |
| Counties and unitary authorities | `Counties_and_Unitary_Authorities_May_2023_UK_BUC` | May 2023 | 218 |
| Integrated care boards | `Integrated_Care_Boards_July_2022_EN_BFC_2022` | July 2022 | 42 |
| NHS England regions | `NHS_England_Regions_July_2022_EN_BGC_2022` | July 2022 | 7 |

The validation script re-checks every join on every run, and the preparation
script aborts if a layer's feature count changes upstream.

> **These ICB boundaries are now historical.** On 1 April 2026, NHS England
> abolished 12 ICBs and created 6, leaving 36. The July 2022 layer still matches
> the codes Fingertips published for area type 221 when this dataset was
> prepared, so the join is correct for these data. But the map shows
> organisations that no longer all exist. When Fingertips publishes figures on
> the new ICBs, the layer has to be replaced by the code-set match described
> above, not by count. See [LIMITATIONS.md](LIMITATIONS.md#data-currency).

> Service names containing parentheses return
> `{"error":{"code":400,"message":"Invalid URL"}}` on this ArcGIS host even when
> correctly percent-encoded. The parenthesis-free aliases are used. Where only a
> full-resolution (`BFC`) layer has a usable alias, it is generalised in-pipeline.

## Geography model

Two **separate, non-hierarchical** trees. The data model has no edge between
them, and a comparison cannot mix them.

- **Administrative:** UK → nation → counties and unitary authorities. England's
  upper tier is genuinely mixed — 21 counties (E10), 36 metropolitan districts
  (E08), 33 London boroughs (E09) and 63 unitary authorities (E06) are siblings,
  and are represented that way rather than forced into a uniform grid. The count
  of 153 came from the live API, not from memory.
- **NHS (England only):** England → NHS England region → ICB.

An ICB is not a child of a local authority and a local authority is not a child
of an ICB. They are overlapping partitions of England whose only shared ancestor
is the nation.

## Settlement index

8,545 ONS Built Up Areas (December 2022) make place search work. Each centroid
is assigned by point-in-polygon to the administrative area *and*, where
applicable, the ICB containing it:

- 8,530 resolved to an administrative area; **15 unresolved** and excluded
  rather than snapped to a nearest guess (generalised boundaries can leave a
  coastal or border centroid outside every polygon).
- 7,085 resolved to an ICB — and **zero** non-England settlements resolved to
  one, which is what confirms the containment is correct rather than coincidental.

A settlement is never treated as equivalent to its containing area. Searching
for a city offers the settlement and any same-named authority as separate
results, and selecting the settlement states: *"Showing [authority]; this is not
a city-only estimate."*

Built Up Areas cover **Great Britain only** — there is no Northern Ireland
settlement layer in this release, recorded in the index metadata rather than
filled with guesses.

## File layout and encoding

```
public/data/
  manifest.json              versioned catalogue, coverage statement, licences
  coverage.json              indicator × nation × geography × period matrix
  join-report.json           unmatched codes and declared-but-empty combinations
  indicators/index.json      full per-indicator metadata
  geography/*.json           boundary layers with vintage, source and licence
  observations/<id>-<geo>.json            aggregate series (map, trend, benchmark)
  observations/<id>-<geo>-subgroups.json  subgroup breakdowns, lazy-loaded
  search/areas.json          areas and nations (39 kB, loaded at startup)
  search/settlements.json    8,545 settlements (1.8 MB, lazy-loaded on first search)
```

Observations use a **columnar encoding**: parallel arrays against shared
dictionaries, with subgroup breakdowns split into separate lazy-loaded files.
For this release that is **85 primary files totalling 12.3 MB (the largest
670 kB)** and **44 subgroup files totalling 32.9 MB**, fetched only when a reader
asks for a breakdown. A view never loads more than one primary file per
indicator and geography. No field, flag
or state is dropped — a reference decoder round-trips every row exactly, and a
unit test proves it, including that an omitted column decodes as `null` rather
than `0`.

## Derived when a file loads

Two things are read off the data in the browser rather than stored, so they stay
right after any refresh:

- **The interval level behind the publisher's England flag.** Fingertips tests
  most indicators against England at 95%, but hypertension (219), depression
  (848) and asthma (90933) prevalence at 99.8%. The level is not in the
  retrieved metadata, so `src/data/selectors/flag-level.ts` finds the level at
  which the flag and the published interval agree for every compared area. A
  unit test checks it against the committed files: 99.8% for those three at
  every geography, 95% for everything else.
- **Per-sex series.** Observations are indexed sex → area → period, because
  some measures (life expectancy) are published only by sex, and a series keyed
  on area and period alone would mix the two populations.

## Refreshing the data

```bash
npm run data:prepare    # fetch, validate, normalise, write (~3 minutes)
npm run data:validate   # independent re-check of the result
```

The preparation script fails loudly rather than emitting partial data. It
aborts on: a missing profile, metadata without definitions (the
`include_definition=yes` flag no longer being honoured), a changed boundary
feature count, simplification that drops a multipolygon part (which would lose
islands), an observation set with no aggregate series, or a period with no range
metadata.

The validation script independently re-checks the output: schema versions, area
counts against expectations, every observation joining to a real boundary by
stable code, confidence intervals bracketing their values, pooled and
single-year periods being disjoint, the benchmark being England and containing
only England rows, every coverage status being documented, **no non-England row
claiming data**, every search entry having a boundary, and no orphan files.

## If the sources are unreachable

The prepared dataset is committed, so the application builds and runs with no
network access. If preparation cannot reach a source it fails with the exact
blocker and writes nothing — it does not fabricate data.

The application distinguishes real from synthetic data at the manifest level
(`dataKind`). Anything other than `"real"` renders an unmissable **DEMONSTRATION
DATA** banner across the top of the application, and the validation script
rejects a non-real dataset outright. **This release is `"real"`** and contains no
synthetic observations.
