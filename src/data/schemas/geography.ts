import { z } from 'zod';
import { licenceSchema } from './manifest';

const positionSchema = z.tuple([z.number(), z.number()]).rest(z.number());
const linearRingSchema = z.array(positionSchema);

export const geometrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: z.array(linearRingSchema) }),
  z.object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(z.array(linearRingSchema)),
  }),
]);
export type AreaGeometry = z.infer<typeof geometrySchema>;

export const areaFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.string(),
  properties: z.object({
    code: z.string(),
    name: z.string(),
    nation: z.string(),
  }),
  geometry: geometrySchema,
});
export type AreaFeature = z.infer<typeof areaFeatureSchema>;

export const boundaryLayerSchema = z.object({
  type: z.literal('FeatureCollection'),
  metadata: z.object({
    key: z.string(),
    areaTypeId: z.number().optional(),
    label: z.string(),
    mode: z.string().optional(),
    level: z.string().optional(),
    boundaryVintage: z.string(),
    boundarySource: z.string(),
    boundaryScope: z.string().optional(),
    generalisation: z.string(),
    simplificationToleranceDegrees: z.number().optional(),
    licence: licenceSchema,
    retrievedAt: z.string(),
    featureCount: z.number(),
  }),
  features: z.array(areaFeatureSchema),
});
export type BoundaryLayer = z.infer<typeof boundaryLayerSchema>;

export const searchEntrySchema = z.object({
  kind: z.enum(['area', 'nation', 'settlement']),
  code: z.string(),
  name: z.string(),
  nation: z.string(),
  areaTypeKey: z.string(),
  areaTypeId: z.number().nullable(),
  areaTypeLabel: z.string(),
  mode: z.string(),
  /**
   * Present only on settlement entries: the administrative area that contains the
   * settlement. A settlement is never treated as equivalent to its container.
   */
  containedBy: z
    .object({ code: z.string(), name: z.string(), areaTypeKey: z.string() })
    .optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  population: z.number().optional(),
  aliases: z.array(z.string()).optional(),
});
export type SearchEntry = z.infer<typeof searchEntrySchema>;

export const searchIndexSchema = z.object({
  retrievedAt: z.string(),
  entryCount: z.number(),
  entries: z.array(searchEntrySchema),
  settlementFile: z.string().optional(),
  settlementSource: z
    .object({ name: z.string(), url: z.string(), licence: z.string() })
    .optional(),
});

/**
 * Settlements are stored compactly and fetched only when someone searches:
 * the full index is far larger than the area index and is not needed to render
 * the atlas.
 */
export const settlementIndexSchema = z.object({
  retrievedAt: z.string(),
  source: z.object({
    name: z.string(), url: z.string(), licence: z.string(), coverage: z.string(),
  }),
  settlementCount: z.number(),
  unresolvedCount: z.number(),
  entryCount: z.number(),
  entries: z.array(
    z.object({
      n: z.string(),   // settlement name
      c: z.string(),   // settlement code
      m: z.enum(['administrative', 'nhs']),
      k: z.string(),   // area type key of the containing area
      bc: z.string(),  // containing area code
      bn: z.string(),  // containing area name
    }),
  ),
});
export type SettlementIndex = z.infer<typeof settlementIndexSchema>;
export type SearchIndex = z.infer<typeof searchIndexSchema>;

export const observationFileSchema = z.object({
  schemaVersion: z.number(),
  indicatorId: z.number(),
  areaTypeId: z.number(),
  areaTypeKey: z.string(),
  sourceUrl: z.string(),
  retrievedAt: z.string(),
  periods: z.array(z.string()),
  periodRangeByPeriod: z.record(z.string(), z.string()),
  periodSeries: z.array(
    z.object({
      range: z.string(),
      years: z.number(),
      pooled: z.boolean(),
      label: z.string(),
      description: z.string(),
      periods: z.array(z.string()),
      latestPeriod: z.string().nullable(),
      periodCount: z.number(),
    }),
  ),
  defaultPeriodSeries: z.string(),
  sex: z.string(),
  age: z.string(),
  benchmark: z.object({
    areaCode: z.string(),
    areaName: z.string(),
    areaTypeId: z.number(),
    label: z.string(),
    data: z.unknown(),
  }),
  data: z.unknown(),
});
export type ObservationFileMeta = z.infer<typeof observationFileSchema>;
