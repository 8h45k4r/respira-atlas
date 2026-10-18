# Licensing and attribution

## Application code

MIT. See [LICENSE](../LICENSE).

## Data

### Observations — OHID Fingertips

Licensed under the **Open Government Licence v3.0**.

> Source: Office for Health Improvement and Disparities (OHID), Fingertips.
> Licensed under the Open Government Licence v3.0.

Indicator definitions, methods and caveats belong to the publisher and are
reproduced unaltered. Each indicator carries its own copyright statement where
one is supplied.

### Boundaries — ONS Open Geography Portal

Licensed under the **Open Government Licence v3.0**.

> Contains National Statistics data © Crown copyright and database right 2026.
> Contains OS data © Crown copyright and database right 2026.

This covers the nation, counties and unitary authorities, ICB, NHS England
region and Built Up Area layers.

Full OGL terms:
<https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/>

Both attributions are shown in the application footer and included in every
exported figure, CSV and figure specification.

## amCharts 5

Interactive maps use **amCharts 5** (version 5.21.2) under its free licence.

The free licence requires an attribution link to amCharts to remain visible on
the chart. **That link is present and has not been removed.** No licence key is
inserted, and nothing in this repository attempts to suppress the branding.

If you deploy this for an organisation that needs the attribution removed, buy a
commercial amCharts licence and add the key via `am5.addLicense()` in
`src/charts/UKChoropleth.tsx`. Do not remove the logo without one.

amCharts licensing: <https://www.amcharts.com/online-store/>

Exported figures are produced by this application's own SVG renderer
(`src/export/`) and are not amCharts output, so they are not subject to that
attribution requirement. The export renderer uses `am5map.geoMercator()`, which
is a re-export of a `d3-geo` projection, to keep screen and file geometry
identical.

## Other dependencies

React (MIT) · Vite (MIT) · Tailwind CSS (MIT) · Radix UI (MIT) · d3-geo
(ISC) · Zod (MIT) · Lucide (ISC) · Playwright (Apache-2.0) · Vitest (MIT).

Fonts: Outfit and IBM Plex (SIL Open Font License 1.1), served from Google Fonts.

## Independence and endorsement

This is an independent working research tool, built and maintained by the team
named in the application under **Methods → Team**.

Team members' institutional affiliations are listed to identify them and their
background. They do **not** mean that any institution has reviewed, endorsed,
funded or approved this atlas, or any analysis produced with it.

The atlas carries no endorsement from:

- the NHS or any NHS organisation,
- the Office for Health Improvement and Disparities,
- the Office for National Statistics,
- any university or employer of a team member.

No institutional logo or branding is used anywhere. The product name is a
working title, not a claim of provenance. The statement appears in the
application footer, on the Team page, and on every exported evidence brief.

Photographs of team members are reproduced with their permission and are served
from this origin; they are not covered by the MIT licence on the source code.
