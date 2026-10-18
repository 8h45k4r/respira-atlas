// Verified configuration for the data preparation pipeline.
// Every value here was confirmed against the live source on 2026-10-18.
// See docs/IMPLEMENTATION-PLAN.md for the verification record.

export const FINGERTIPS_BASE = 'https://fingertips.phe.org.uk/api';

/** Respiratory disease profile ("INHALE"). Verified: GET /api/profiles -> Id 29. */
export const RESPIRATORY_PROFILE_ID = 29;

/** Smoking profile, used only for risk-factor indicators that profile 29 does not carry. */
export const SMOKING_PROFILE_ID = 18;

/** England benchmark area. */
export const ENGLAND_AREA_CODE = 'E92000001';
export const ENGLAND_AREA_TYPE_ID = 15;

/**
 * Fingertips area types we support, with the ONS boundary layer each joins to.
 * `mode` keeps administrative and NHS geographies in separate, non-hierarchical trees.
 */
export const AREA_TYPES = {
  502: {
    id: 502,
    key: 'ctyua23',
    mode: 'administrative',
    level: 'upper-tier',
    label: 'Counties and unitary authorities',
    shortLabel: 'Counties & UAs',
    fingertipsName: 'Upper tier local authorities (post 4/23)',
    boundaryVintage: 'May 2023',
    codeField: 'CTYUA23CD',
    nameField: 'CTYUA23NM',
    arcgisService: 'Counties_and_Unitary_Authorities_May_2023_UK_BUC',
    // The ONS layer is UK-wide (218 areas); Fingertips supplies England only (153).
    boundaryScope: 'UK',
    dataScope: 'England',
    expectedBoundaryCount: 218,
  },
  221: {
    id: 221,
    key: 'icb22',
    mode: 'nhs',
    level: 'icb',
    label: 'Integrated care boards',
    shortLabel: 'ICBs',
    fingertipsName: 'ICBs, former STPs',
    // July 2022, not April 2023. Both vintages contain 42 ICBs, but two were
    // recoded in the later release (E54000052/E54000053 -> E54000063/E54000064).
    // Fingertips area type 221 publishes against the July 2022 codes, verified by
    // an exact code-set comparison, so this is the vintage that joins without a crosswalk.
    boundaryVintage: 'July 2022',
    codeField: 'ICB22CD',
    nameField: 'ICB22NM',
    arcgisService: 'Integrated_Care_Boards_July_2022_EN_BFC_2022',
    boundaryScope: 'England',
    dataScope: 'England',
    expectedBoundaryCount: 42,
  },
  223: {
    id: 223,
    key: 'nhser22',
    mode: 'nhs',
    level: 'nhs-region',
    label: 'NHS England regions',
    shortLabel: 'NHS regions',
    fingertipsName: 'NHS regions',
    // July 2022 for the same reason: the January 2024 release recodes East of England
    // and North West (E40000007/E40000010 -> E40000013/E40000014) while describing the
    // same seven regions. Fingertips area type 223 uses the July 2022 codes.
    boundaryVintage: 'July 2022',
    codeField: 'NHSER22CD',
    nameField: 'NHSER22NM',
    arcgisService: 'NHS_England_Regions_July_2022_EN_BGC_2022',
    boundaryScope: 'England',
    dataScope: 'England',
    expectedBoundaryCount: 7,
  },
};

/** UK nations layer — navigation frame, always present, never a data geography. */
export const NATIONS_LAYER = {
  key: 'nations',
  label: 'UK nations',
  boundaryVintage: 'December 2025',
  codeField: 'CTRY25CD',
  nameField: 'CTRY25NM',
  arcgisService: 'Countries_December_2025_Boundaries_UK_BUC',
  expectedBoundaryCount: 4,
};

export const ARCGIS_HOST =
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';

export const BOUNDARY_LICENCE = {
  name: 'Open Government Licence v3.0',
  url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  attribution:
    'Contains National Statistics data © Crown copyright and database right 2026. ' +
    'Contains OS data © Crown copyright and database right 2026.',
  publisher: 'Office for National Statistics, Open Geography Portal',
  publisherUrl: 'https://geoportal.statistics.gov.uk/',
};

export const FINGERTIPS_LICENCE = {
  name: 'Open Government Licence v3.0',
  url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  attribution:
    'Source: Office for Health Improvement and Disparities (OHID), Fingertips. ' +
    'Licensed under the Open Government Licence v3.0.',
  publisher: 'Office for Health Improvement and Disparities',
  publisherUrl: 'https://fingertips.phe.org.uk/profile/inhale',
};

/**
 * The indicator set for the initial release. Every IID below was read from
 * GET /api/indicator_metadata/by_profile_id?profile_id=29 (or profile 18 where noted)
 * on 2026-10-18 — none is invented. `domain` drives grouping in the UI only.
 *
 * Availability per area type is NOT declared here. It is discovered at prepare time
 * from GET /api/available_data?indicator_id=<iid> and written into the coverage matrix.
 */
export const INDICATORS = [
  { iid: 93963, profileId: 29, domain: 'mortality',   direction: 'low-is-good' },
  { iid: 40701, profileId: 29, domain: 'mortality',   direction: 'low-is-good' },
  { iid: 93724, profileId: 29, domain: 'mortality',   direction: 'low-is-good' },
  { iid: 1204,  profileId: 29, domain: 'copd',        direction: 'low-is-good' },
  { iid: 253,   profileId: 29, domain: 'copd',        direction: 'not-interpretable' },
  { iid: 93577, profileId: 29, domain: 'copd',        direction: 'low-is-good' },
  { iid: 90933, profileId: 29, domain: 'asthma',      direction: 'not-interpretable' },
  { iid: 93573, profileId: 29, domain: 'asthma',      direction: 'low-is-good' },
  { iid: 90810, profileId: 29, domain: 'children',    direction: 'low-is-good' },
  { iid: 93576, profileId: 29, domain: 'children',    direction: 'low-is-good' },
  { iid: 93575, profileId: 29, domain: 'respiratory', direction: 'low-is-good' },
  { iid: 93574, profileId: 29, domain: 'pneumonia',   direction: 'low-is-good' },
  { iid: 92443, profileId: 29, domain: 'risk-factor', direction: 'low-is-good' },
  { iid: 93867, profileId: 29, domain: 'environment', direction: 'low-is-good' },
  { iid: 93759, profileId: 29, domain: 'environment', direction: 'low-is-good' },
];

export const DOMAIN_LABELS = {
  mortality: 'Respiratory mortality',
  copd: 'COPD',
  asthma: 'Asthma',
  pneumonia: 'Pneumonia',
  respiratory: 'All respiratory disease',
  children: 'Childhood respiratory outcomes',
  'risk-factor': 'Risk factors',
  environment: 'Environmental and contextual',
};

/** Bumped whenever the shape of the emitted files changes. */
export const DATA_SCHEMA_VERSION = 1;
