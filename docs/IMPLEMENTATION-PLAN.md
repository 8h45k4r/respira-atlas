# Implementation plan and verified assumptions

Written before implementation, after live inspection of every external source named below.
Date of verification: 2026-10-18.

## 1. What was actually verified (not assumed)

### Fingertips API

| Check | Endpoint | Result |
|---|---|---|
| API reachable, no key, CORS-free from build script | `GET /api/profiles` | HTTP 200, 38 profiles |
| Respiratory profile exists | `GET /api/profiles` | Profile **29**, key `respiratory-disease` ("INHALE") |
| Indicator set | `GET /api/indicator_metadata/by_profile_id?profile_id=29` | **34 indicators** with real IIDs |
| Full metadata requires an explicit flag | `GET /api/indicator_metadata/by_indicator_id?indicator_ids=93577&include_definition=yes` | Without the flag only `Name`, `DataSource` are returned. With it: `Definition, Rationale, DataSource, IndSourceLink, IndMethod, StandardPop, CIMethod, CountSource, CountDefinition, DenomSource, DenomDefinition, DiscControl, Caveats, Copyright, SimpleName, SimpleDefinition` |
| Per-indicator geography availability | `GET /api/available_data?indicator_id=93577` | `[{223},{221},{66},{15}]` — i.e. NHS regions, ICBs, sub-ICBs, England. **No local authority.** |
| Observations | `GET /api/all_data/csv/by_indicator_id?indicator_ids=…&child_area_type_id=…&parent_area_type_id=15&profile_id=29` | CSV with `Value, Lower/Upper CI 95.0 limit, Lower/Upper CI 99.8 limit, Count, Denominator, Value note, Recent Trend, Compared to England value or percentiles, Time period, Time period range, Time period Sortable` |

**Two findings that shape the whole product:**

1. `profile_id` is **required** on the observations endpoint. Omitting it returns a valid CSV header and zero rows — a silent empty result, not an error. The prep script treats a header-only response as a hard failure.
2. **Availability is per indicator × per area type.** Emergency-admission indicators (93575, 93577) are published for ICB/NHS-region/sub-ICB only, while mortality indicators (93963, 1204) are published for local authorities. There is no single geography that carries the whole respiratory indicator set. Coverage is therefore discovered from `/api/available_data` per indicator and published as a coverage matrix, never inferred.

### Coverage is England-only

Fingertips profile 29 is an OHID (England) product. Every area type it exposes is an English geography (`E0…`, `E4…`, `E5…`) plus an England benchmark (`E92000001`). There is **no** Scotland, Wales or Northern Ireland respiratory data in this source. Consequences, implemented as rules rather than copy:

- All four nations stay on the map and remain navigable.
- Scotland, Wales and Northern Ireland render in a distinct "not covered by this dataset" style — never as a value, never as zero.
- The benchmark is **England**, labelled as England, and no UK benchmark is computed anywhere.
- Every title and export carries the coverage label.

Adapters for devolved-nation sources are defined as interfaces with a declared `status: 'not-implemented'`. They are not populated with invented observations.

### Boundaries — ONS Open Geography Portal (ArcGIS REST, Open Government Licence v3)

Host: `services1.arcgis.com/ESMARspQHYMw9BZ9`. GeoJSON with `f=geojson&outSR=4326` verified working.

| Layer | Service | Features | Matches |
|---|---|---|---|
| UK nations | `Countries_December_2025_Boundaries_UK_BUC` | 4 | E92/W92/S92/N92 |
| Counties & UAs (UK) | `Counties_and_Unitary_Authorities_May_2023_UK_BUC` | **218** | England 153 (E06:63, E08:36, E09:33, E10:21) + Wales 22 + Scotland 32 + NI 11 |
| ICBs | `Integrated_Care_Boards_April_2023_EN_BGC` | **42** | Fingertips area type 221 returns **42** areas — exact match |
| NHS England regions | `NHS_England_Regions_January_2024_EN_BGC` | **7** | Fingertips area type 223 returns **7** areas — exact match |

The English upper-tier count was taken from the live API (`/api/areas/by_area_type?area_type_id=502` → 153), not hardcoded from memory. Join is on stable codes (`CTYUA23CD`, `ICB23CD`, `NHSER24CD`) against Fingertips `Code`. No name matching anywhere.

Service names containing parentheses return `{"error":{"code":400,"message":"Invalid URL"}}` on this host even when percent-encoded; the parenthesis-free aliases are used.

### amCharts

Installed and pinned: **@amcharts/amcharts5 5.21.2** (verified `npm view` latest on the date above). Unlicensed use retains the amCharts attribution link; no licence key is inserted and no logo is removed. Licensing is documented in `docs/LICENSING.md`.

## 2. Geography model

Two **separate, non-hierarchical** modes. The data model has no edge between them.

- **Administrative:** UK → nation → counties & unitary authorities (May 2023). England's mixed structure is represented as it is: counties (E10), metropolitan districts (E08), London boroughs (E09) and unitary authorities (E06) are siblings at the upper tier, not a uniform grid.
- **NHS (England only):** England → NHS England region (2024) → ICB (April 2023).

An ICB is never a child of a local authority and a local authority is never a child of an ICB. The two trees are selected by mode and cannot be mixed in one comparison.

## 3. Statistical and cartographic rules encoded in code

- Rates are used for burden comparison; counts are shown separately and never mapped as burden.
- Source-provided confidence intervals are preserved; intervals are never derived from a rate.
- Source-provided significance flags (`Compared to England value or percentiles`) are used where present; overlapping intervals are **not** treated as a significance test.
- Local age-standardised rates are never averaged to make a national figure; the England benchmark is the source's own England row.
- `0`, missing, suppressed, and not-applicable are four distinct states in a discriminated union — never collapsed.
- Classification defaults to quantile with explicit breakpoints displayed; breaks are frozen when comparing periods and any rescale is announced.
- Financial and calendar years are kept distinct; multi-year pooled periods are flagged and not plotted as annual points.
- Comparisons across incompatible boundary vintages are blocked with a stated reason.

## 4. Build order

A vertical slice first: one verified indicator → valid UK map → selected area → benchmark + trend → evidence statement → genuine SVG export. Then the full indicator set and the remaining two modes.

## 5. Export

amCharts' own export is not relied on for vector output. A dedicated SVG renderer builds the figure from the same validated view model the screen uses, with `d3-geo` path generation under the identical projection amCharts renders with (`am5map.geoMercator()`), so screen and file agree. Downloads are asserted to contain real `<path d="…">` and `<text>` nodes, not an embedded raster.
