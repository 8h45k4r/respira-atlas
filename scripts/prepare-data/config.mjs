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
/**
 * Topics group indicators for navigation. A topic is a curatorial choice; the
 * `domain` beneath it mirrors how the publisher groups the measure.
 *
 * Order here is the order shown in the interface: population health first
 * because it frames everything else, wider determinants last because it is
 * context rather than outcome.
 */
export const TOPICS = {
  'population-health': {
    key: 'population-health',
    label: 'Population health and life expectancy',
    short: 'Population health',
    question: 'How long do people live here, and what are they dying of?',
  },
  respiratory: {
    key: 'respiratory',
    label: 'Respiratory health',
    short: 'Respiratory',
    question: 'How does the burden of lung disease vary?',
  },
  cardiovascular: {
    key: 'cardiovascular',
    label: 'Cardiovascular health',
    short: 'Cardiovascular',
    question: 'Where is heart and circulatory disease concentrated?',
  },
  cancer: {
    key: 'cancer',
    label: 'Cancer',
    short: 'Cancer',
    question: 'How does cancer mortality vary between places?',
  },
  'mental-health': {
    key: 'mental-health',
    label: 'Mental health',
    short: 'Mental health',
    question: 'What do the available mental health measures show?',
  },
  'child-maternal': {
    key: 'child-maternal',
    label: 'Child and maternal health',
    short: 'Child health',
    question: 'How do outcomes for children and infants differ by place?',
  },
  metabolic: {
    key: 'metabolic',
    label: 'Obesity and metabolic health',
    short: 'Metabolic',
    question: 'How does measured and recorded weight vary?',
  },
  'alcohol-drugs': {
    key: 'alcohol-drugs',
    label: 'Alcohol and drugs',
    short: 'Alcohol and drugs',
    question: 'Where is alcohol-related harm highest?',
  },
  'risk-factors': {
    key: 'risk-factors',
    label: 'Behavioural risk factors',
    short: 'Risk factors',
    question: 'How do smoking and physical inactivity vary?',
  },
  environment: {
    key: 'environment',
    label: 'Environment',
    short: 'Environment',
    question: 'How does environmental exposure differ between places?',
  },
  'wider-determinants': {
    key: 'wider-determinants',
    label: 'Wider determinants',
    short: 'Determinants',
    question: 'What is the social and economic context?',
  },
};

export const INDICATORS = [
  // ---------------------------------------------------------------- population
  { iid: 90366, profileId: 125, topic: 'population-health', domain: 'life-expectancy', direction: 'high-is-good' },
  { iid: 93823, profileId: 125, topic: 'population-health', domain: 'mortality',       direction: 'low-is-good' },
  { iid: 93721, profileId: 125, topic: 'population-health', domain: 'mortality',       direction: 'low-is-good' },

  // --------------------------------------------------------------- respiratory
  { iid: 93963, profileId: 29,  topic: 'respiratory', domain: 'mortality',   direction: 'low-is-good' },
  { iid: 40701, profileId: 29,  topic: 'respiratory', domain: 'mortality',   direction: 'low-is-good' },
  { iid: 93724, profileId: 29,  topic: 'respiratory', domain: 'mortality',   direction: 'low-is-good' },
  { iid: 1204,  profileId: 29,  topic: 'respiratory', domain: 'copd',        direction: 'low-is-good' },
  { iid: 253,   profileId: 29,  topic: 'respiratory', domain: 'copd',        direction: 'not-interpretable' },
  { iid: 93577, profileId: 29,  topic: 'respiratory', domain: 'copd',        direction: 'low-is-good' },
  { iid: 90933, profileId: 29,  topic: 'respiratory', domain: 'asthma',      direction: 'not-interpretable' },
  { iid: 93573, profileId: 29,  topic: 'respiratory', domain: 'asthma',      direction: 'low-is-good' },
  { iid: 90810, profileId: 29,  topic: 'respiratory', domain: 'children',    direction: 'low-is-good' },
  { iid: 93576, profileId: 29,  topic: 'respiratory', domain: 'children',    direction: 'low-is-good' },
  { iid: 93575, profileId: 29,  topic: 'respiratory', domain: 'respiratory', direction: 'low-is-good' },
  { iid: 93574, profileId: 29,  topic: 'respiratory', domain: 'pneumonia',   direction: 'low-is-good' },

  // ------------------------------------------------------------ cardiovascular
  { iid: 40401, profileId: 125, topic: 'cardiovascular', domain: 'mortality',  direction: 'low-is-good' },
  { iid: 93956, profileId: 125, topic: 'cardiovascular', domain: 'mortality',  direction: 'low-is-good' },
  { iid: 90986, profileId: 135, topic: 'cardiovascular', domain: 'admissions', direction: 'low-is-good' },
  { iid: 219,   profileId: 135, topic: 'cardiovascular', domain: 'prevalence', direction: 'not-interpretable' },

  // -------------------------------------------------------------------- cancer
  { iid: 40501, profileId: 125, topic: 'cancer', domain: 'mortality', direction: 'low-is-good' },
  { iid: 93959, profileId: 125, topic: 'cancer', domain: 'mortality', direction: 'low-is-good' },

  // --------------------------------------------------------------- mental health
  { iid: 41001, profileId: 125, topic: 'mental-health', domain: 'mortality',  direction: 'low-is-good' },
  { iid: 848,   profileId: 50,  topic: 'mental-health', domain: 'prevalence', direction: 'not-interpretable' },
  { iid: 21001, profileId: 50,  topic: 'mental-health', domain: 'admissions', direction: 'low-is-good' },

  // ------------------------------------------------------------ child and maternal
  { iid: 92196, profileId: 125, topic: 'child-maternal', domain: 'mortality',  direction: 'low-is-good' },
  { iid: 90801, profileId: 125, topic: 'child-maternal', domain: 'mortality',  direction: 'low-is-good' },
  { iid: 92517, profileId: 105, topic: 'child-maternal', domain: 'infant',     direction: 'high-is-good' },
  { iid: 90323, profileId: 105, topic: 'child-maternal', domain: 'childhood',  direction: 'low-is-good' },

  // ----------------------------------------------------------------- metabolic
  { iid: 93881, profileId: 135, topic: 'metabolic', domain: 'obesity', direction: 'low-is-good' },

  // ------------------------------------------------------------- alcohol/drugs
  { iid: 91380, profileId: 125, topic: 'alcohol-drugs', domain: 'mortality', direction: 'low-is-good' },

  // -------------------------------------------------------------- risk factors
  { iid: 92443, profileId: 29,  topic: 'risk-factors', domain: 'smoking',  direction: 'low-is-good' },
  { iid: 93015, profileId: 135, topic: 'risk-factors', domain: 'activity', direction: 'low-is-good' },

  // --------------------------------------------------------------- environment
  { iid: 93867, profileId: 29,  topic: 'environment', domain: 'air-quality', direction: 'low-is-good' },

  // -------------------------------------------------------- wider determinants
  { iid: 94240, profileId: 135, topic: 'wider-determinants', domain: 'deprivation', direction: 'not-interpretable' },
  { iid: 93700, profileId: 105, topic: 'wider-determinants', domain: 'income',      direction: 'low-is-good' },

  /*
   * Carried deliberately as a negative case. /api/available_data declares 93759
   * (fuel poverty) at eight geographies; the observations endpoint returns no
   * rows at any of them. Keeping it here exercises the verification path on
   * every run and keeps the discrepancy visible in the coverage view rather
   * than quietly forgotten.
   */
  { iid: 93759, profileId: 29,  topic: 'wider-determinants', domain: 'fuel-poverty', direction: 'low-is-good' },
];

export const DOMAIN_LABELS = {
  'life-expectancy': 'Life expectancy',
  mortality: 'Mortality',
  admissions: 'Hospital admissions',
  prevalence: 'Recorded prevalence',
  copd: 'COPD',
  asthma: 'Asthma',
  pneumonia: 'Pneumonia',
  respiratory: 'All respiratory disease',
  children: 'Childhood respiratory outcomes',
  childhood: 'Childhood measurement',
  infant: 'Infant and maternal',
  obesity: 'Obesity',
  smoking: 'Smoking',
  activity: 'Physical activity',
  'air-quality': 'Air quality',
  deprivation: 'Deprivation',
  income: 'Income',
  'fuel-poverty': 'Fuel poverty',
};

/** Bumped whenever the shape of the emitted files changes. */
export const DATA_SCHEMA_VERSION = 2;
