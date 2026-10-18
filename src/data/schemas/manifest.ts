import { z } from 'zod';

export const licenceSchema = z.object({
  name: z.string(),
  url: z.string(),
  attribution: z.string(),
  publisher: z.string(),
  publisherUrl: z.string(),
});
export type Licence = z.infer<typeof licenceSchema>;

export const periodSeriesSchema = z.object({
  range: z.string(),
  years: z.number(),
  /** True when consecutive periods overlap and are not independent observations. */
  pooled: z.boolean(),
  label: z.string(),
  periodCount: z.number(),
  latestPeriod: z.string().nullable(),
});
export type PeriodSeries = z.infer<typeof periodSeriesSchema>;

export const geographyAvailabilitySchema = z.object({
  areaTypeId: z.number(),
  areaTypeKey: z.string(),
  mode: z.enum(['administrative', 'nhs']),
  label: z.string(),
  boundaryVintage: z.string(),
  file: z.string(),
  subgroupFile: z.string().nullable(),
  periods: z.array(z.string()),
  periodSeries: z.array(periodSeriesSchema),
  defaultPeriodSeries: z.string(),
  mixesPooledAndSingleYear: z.boolean(),
  latestPeriod: z.string().nullable(),
  aggregateSex: z.string(),
  aggregateAge: z.string(),
  /**
   * The combined series, when the publisher supplies one. Null for measures
   * published only by sex — life expectancy, for instance — where no combined
   * figure exists and the reader must choose.
   */
  defaultSex: z.string().nullable(),
  requiresSexChoice: z.boolean(),
  primarySexes: z.array(z.string()),
  primaryAges: z.array(z.string()),
  sexes: z.array(z.string()),
  ages: z.array(z.string()),
  categoryTypes: z.array(z.string()),
  subgroupRowCount: z.number(),
  areaCount: z.number(),
  areasWithValue: z.number(),
  observationCount: z.number(),
  totalRowCount: z.number(),
  hasBenchmark: z.boolean(),
  hasConfidenceIntervals: z.boolean(),
  hasSignificanceFlags: z.boolean(),
  hasTrendFlags: z.boolean(),
  suppressedCount: z.number(),
  missingCount: z.number(),
});
export type GeographyAvailability = z.infer<typeof geographyAvailabilitySchema>;

export const indicatorSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string(),
  topic: z.string(),
  topicLabel: z.string(),
  domain: z.string(),
  domainLabel: z.string(),
  definition: z.string().nullable(),
  simpleDefinition: z.string().nullable(),
  rationale: z.string().nullable(),
  methodology: z.string().nullable(),
  standardPopulation: z.string().nullable(),
  confidenceIntervalMethod: z.string().nullable(),
  numeratorDefinition: z.string().nullable(),
  numeratorSource: z.string().nullable(),
  denominatorDefinition: z.string().nullable(),
  denominatorSource: z.string().nullable(),
  disclosureControl: z.string().nullable(),
  caveats: z.string().nullable(),
  copyright: z.string().nullable(),
  dataSource: z.string().nullable(),
  sourceLink: z.string().nullable(),
  unit: z.string().nullable(),
  unitMultiplier: z.number().nullable(),
  valueType: z.string().nullable(),
  yearType: z.string().nullable(),
  /** How to read the measure. 'not-interpretable' blocks better/worse language. */
  direction: z.enum(['low-is-good', 'high-is-good', 'not-interpretable']),
  countIsMeaningful: z.boolean(),
  dataQualityNote: z.string().nullable(),
  lastUploadedAt: z.string().nullable(),
  availableAreaTypeIds: z.array(z.number()),
  supportedAreaTypeIds: z.array(z.number()),
  coverage: z.object({ nations: z.array(z.string()), note: z.string() }),
  licence: licenceSchema,
  retrievedAt: z.string(),
  geographies: z.record(z.string(), geographyAvailabilitySchema),
});
export type Indicator = z.infer<typeof indicatorSchema>;

export const areaTypeSchema = z.object({
  key: z.string(),
  areaTypeId: z.number(),
  mode: z.enum(['administrative', 'nhs']),
  level: z.string(),
  label: z.string(),
  shortLabel: z.string(),
  boundaryVintage: z.string(),
  boundaryScope: z.string(),
  dataScope: z.string(),
  boundarySource: z.string(),
  file: z.string(),
});
export type AreaTypeMeta = z.infer<typeof areaTypeSchema>;

export const manifestSchema = z.object({
  schemaVersion: z.number(),
  generatedAt: z.string(),
  /** 'real' or 'demonstration'. The UI banners loudly on anything but 'real'. */
  dataKind: z.enum(['real', 'demonstration']),
  profile: z.object({ id: z.number(), name: z.string(), key: z.string() }),
  sourceProfiles: z.array(
    z.object({ id: z.number(), name: z.string(), key: z.string() }),
  ),
  coverage: z.object({
    nationsWithData: z.array(z.string()),
    nationsVisibleWithoutData: z.array(z.string()),
    benchmark: z.object({ areaCode: z.string(), label: z.string(), scope: z.string() }),
    statement: z.string(),
  }),
  geographyModes: z.record(
    z.string(),
    z.object({ label: z.string(), description: z.string(), levels: z.array(z.string()) }),
  ),
  areaTypes: z.record(z.string(), areaTypeSchema),
  nationsLayer: z.object({
    key: z.string(), file: z.string(), boundaryVintage: z.string(),
  }),
  indicators: z.array(
    z.object({
      id: z.number(), name: z.string(), shortName: z.string(),
      topic: z.string(), topicLabel: z.string(), domain: z.string(),
      domainLabel: z.string(), unit: z.string().nullable(),
      valueType: z.string().nullable(), yearType: z.string().nullable(),
      direction: z.string(), geographies: z.array(z.string()),
      latestPeriodByGeography: z.record(z.string(), z.string().nullable()),
    }),
  ),
  topics: z.record(
    z.string(),
    z.object({
      key: z.string(),
      label: z.string(),
      short: z.string(),
      question: z.string(),
      indicatorCount: z.number(),
    }),
  ),
  domains: z.record(z.string(), z.string()),
  excludedIndicators: z.array(
    z.object({
      id: z.number(), reason: z.string(),
      availableAreaTypeIds: z.array(z.number()), verifiedEmpty: z.boolean(),
    }),
  ),
  licences: z.object({ observations: licenceSchema, boundaries: licenceSchema }),
  sources: z.record(z.string(), z.record(z.string(), z.string())),
});
export type Manifest = z.infer<typeof manifestSchema>;

export const coverageStatusSchema = z.enum([
  'data', 'no-data', 'boundary-only', 'not-applicable', 'suppressed',
]);
export type CoverageStatus = z.infer<typeof coverageStatusSchema>;

export const coverageSchema = z.object({
  schemaVersion: z.number(),
  generatedAt: z.string(),
  legend: z.record(z.string(), z.string()),
  matrix: z.array(
    z.object({
      indicatorId: z.number(),
      indicatorName: z.string(),
      topic: z.string(),
      nation: z.string(),
      areaTypeKey: z.string(),
      areaTypeLabel: z.string(),
      mode: z.string(),
      status: coverageStatusSchema,
      periods: z.array(z.string()),
      latestPeriod: z.string().nullable(),
    }),
  ),
});
export type Coverage = z.infer<typeof coverageSchema>;
