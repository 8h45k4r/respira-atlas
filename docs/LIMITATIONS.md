# Known limitations and unsupported coverage

Stated plainly, because a tool that hides its limits is worse than one that has
none.

## Coverage

**England only.** The source (OHID Fingertips INHALE) is an England product.
There are no respiratory indicators here for Scotland, Wales or Northern
Ireland. Those nations remain on the map and navigable, drawn as *not covered by
this dataset*, and no UK-wide benchmark is computed anywhere.

Source adapters for devolved-nation datasets are defined as interfaces with
status `not-implemented`. They are **not** populated with invented observations.
Integrating PHS (Scotland), DHCW/StatsWales (Wales) or DoH/NISRA (Northern
Ireland) would require verifying each source's own indicator definitions,
geographies, periods and comparability before anything could be shown
alongside the England figures — and in most cases the definitions differ enough
that a direct comparison would not be valid even once the data were in hand.

## Geography

- Only **upper-tier** local authorities are included. Lower-tier districts
  (area type 501) are published for several indicators but are not in this
  release.
- **Northern Ireland settlements are absent** from place search: ONS Built Up
  Areas cover Great Britain only.
- **15 settlements** could not be assigned to a containing area and are excluded
  from search rather than attached to a guess.
- Boundaries are generalised for display. They are not suitable for measurement,
  and a point near a coast or border may fall just outside its polygon.
- Sub-ICB locations, GP practices and MSOAs are not included, although several
  indicators are published at those levels.

## Indicators

- **14 indicators**, not the full respiratory profile. The source profile holds
  34; the rest were either not published at a supported geography or outside the
  scope of this release.
- **Fuel poverty (93759) is excluded** — declared available by the source's own
  index at eight geographies, returns no rows at any. Recorded as a source
  discrepancy in the Coverage view.
- Occupational exposure has **no indicator** here. No authoritative dataset with
  a compatible geography, period and definition was verified, and a generic
  deprivation measure is not a measure of occupational exposure. Nothing was
  manufactured to fill the gap.
- Air pollution (PM2.5) is published at local authority level only, so it cannot
  be paired with the ICB-level admission indicators.

## Analysis

- **No multivariable analysis, no modelling, no adjustment beyond what the
  publisher already applied.** This is a descriptive atlas.
- **No causal inference of any kind.**
- No significance test is computed here; only the publisher's own flags are used.
- Subgroup breakdowns are limited to what the publisher supplies (mostly sex).
  There is no deprivation-decile or ethnicity breakdown in this release.
- Inequality is reported as a gap between published subgroups within one area
  and period. No slope index of inequality or similar summary measure is computed.

## Not implemented

- **Small multiples.** The brief envisaged a shared-scale small-multiples view
  across periods. The scale-locking machinery that would make it correct is
  built and used by the main map, but the small-multiples view itself is not in
  this release. Comparing periods is done by locking the scale and changing the
  period.
- Direct runtime API access. All data are prepared at build time. This is
  deliberate: it makes the site fully static, removes any CORS dependency, and
  makes every build reproducible.
- Saved figure configurations beyond the shareable URL and the downloadable JSON
  figure specification.

## Browser storage

Preferences are stored in the browser only. They do **not** synchronise between
users or devices and are not sent anywhere. Sharing a view means sharing the URL.

## Accessibility

Built to WCAG 2.2 AA and tested for keyboard operation, focus visibility,
non-colour selection cues, screen-reader announcements, text alternatives for
every figure and reduced-motion support. It has **not** been through a formal
third-party audit or tested with every assistive technology. If you find a
barrier, it is a defect.

## What this product cannot tell you

- Why a figure differs between places.
- Whether an intervention would change it.
- Anything about an individual in an area.
- Whether a service is performing well or badly. Need, access, case-finding and
  coding all move these numbers, and none of them is separable here.
