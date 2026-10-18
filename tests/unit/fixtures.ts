import type { Indicator } from '@/data/schemas/manifest';
import type { Observation, PresentObservation } from '@/data/schemas/observation';

export const licence = {
  name: 'Open Government Licence v3.0',
  url: 'https://example.org/ogl',
  attribution: 'Source: OHID.',
  publisher: 'Office for Health Improvement and Disparities',
  publisherUrl: 'https://fingertips.phe.org.uk/',
};

export function makeIndicator(overrides: Partial<Indicator> = {}): Indicator {
  return {
    id: 93577,
    name: 'Emergency hospital admissions for COPD, all ages',
    shortName: 'Emergency admissions for COPD',
    topic: 'respiratory',
    topicLabel: 'Respiratory health',
    domain: 'copd',
    domainLabel: 'COPD',
    definition: 'Emergency admissions for COPD.',
    simpleDefinition: null,
    rationale: null,
    methodology: null,
    standardPopulation: '2013 European Standard Population',
    confidenceIntervalMethod: 'Byar’s method',
    numeratorDefinition: 'Emergency admissions',
    numeratorSource: 'HES',
    denominatorDefinition: 'Resident population',
    denominatorSource: 'ONS',
    disclosureControl: null,
    caveats: null,
    copyright: null,
    dataSource: 'OHID, based on NHS England data',
    sourceLink: null,
    unit: 'per 100,000',
    unitMultiplier: 100000,
    valueType: 'Directly standardised rate',
    yearType: 'Financial',
    direction: 'low-is-good',
    countIsMeaningful: true,
    dataQualityNote: null,
    lastUploadedAt: null,
    availableAreaTypeIds: [221, 223],
    supportedAreaTypeIds: [221, 223],
    coverage: { nations: ['England'], note: 'England only.' },
    licence,
    retrievedAt: '2026-10-18T00:00:00.000Z',
    geographies: {},
    ...overrides,
  };
}

export function present(
  value: number,
  overrides: Partial<PresentObservation> = {},
): PresentObservation {
  return {
    areaCode: 'E54000008',
    period: '2024/25',
    sex: 'Persons',
    age: 'All ages',
    categoryType: null,
    category: null,
    state: 'present',
    value,
    lowerCi95: null,
    upperCi95: null,
    lowerCi998: null,
    upperCi998: null,
    count: null,
    denominator: null,
    significance: 'not-compared',
    trend: 'not-available',
    note: null,
    ...overrides,
  };
}

export function nonPresent(
  state: 'missing' | 'suppressed' | 'not-applicable',
  overrides: Partial<Observation> = {},
): Observation {
  return {
    areaCode: 'E54000008',
    period: '2024/25',
    sex: 'Persons',
    age: 'All ages',
    categoryType: null,
    category: null,
    state,
    significance: 'not-compared',
    trend: 'not-available',
    note: null,
    ...overrides,
  } as Observation;
}
