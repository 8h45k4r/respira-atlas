# Data sources and preparation

## Sources

| Source | Used for | Licence |
|---|---|---|
| [OHID Fingertips](https://fingertips.phe.org.uk/profile/inhale), respiratory disease profile (ID 29) | All observations and indicator metadata | Open Government Licence v3.0 |
| [ONS Open Geography Portal](https://geoportal.statistics.gov.uk/) | Boundaries and the settlement index | Open Government Licence v3.0 |

No API key is needed by either. Neither is called at runtime: both are
build-time only, in `scripts/prepare-data`.

## The indicator set

14 indicators, each resolved from source metadata — no ID is invented:

| ID | Indicator | Domain | Unit |
|---|---|---|---|
| 93963 | Mortality rate from respiratory disease, all ages | Mortality | per 100,000 |
| 40701 | Under 75 mortality rate from respiratory disease | Mortality | per 100,000 |
| 93724 | Under 75 mortality from respiratory disease considered preventable | Mortality | per 100,000 |
| 1204 | Mortality rate from COPD, all ages | COPD | per 100,000 |
| 253 | COPD: QOF prevalence | COPD | % |
| 93577 | Emergency hospital admissions for COPD, all ages | COPD | per 100,000 |
| 90933 | Asthma: QOF prevalence | Asthma | % |
| 93573 | Emergency hospital admissions for asthma in adults (19+) | Asthma | per 100,000 |
| 90810 | Hospital admissions for asthma (under 19) | Children | per 100,000 |
| 93576 | Emergency admissions for bronchiolitis (under 2) | Children | per 100,000 |
| 93575 | Emergency hospital admissions for respiratory disease | Respiratory | per 100,000 |
| 93574 | Emergency hospital admissions for pneumonia | Pneumonia | per 100,000 |
| 92443 | Smoking prevalence in adults (APS) | Risk factor | % |
| 93867 | Air pollution: fine particulate matter (PM2.5) | Environmental | µg/m³ |

Each keeps its full published metadata: definition, rationale, numerator and
denominator definitions and sources, method, standard population, confidence
interval method, disclosure control, caveats, copyright, source URL, publisher,
retrieval date and licence.

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
dictionaries. An object-per-row JSON encoding put the dataset at 77 MB; the same
rows encoded columnarly, with subgroups split into separate lazy-loaded files,
come to **18.6 MB total with primary files under 660 kB each**. No field, flag
or state is dropped — a reference decoder round-trips every row exactly, and a
unit test proves it, including that an omitted column decodes as `null` rather
than `0`.

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
