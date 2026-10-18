import { z } from 'zod';

/**
 * Observation availability is a closed set of four mutually exclusive states.
 *
 * `zero` is deliberately absent: a value of 0 is a *present* observation whose
 * value happens to be 0. Collapsing zero into missing — or missing into zero —
 * is the single most common way a choropleth misleads, so the type system makes
 * it impossible to read a value without first narrowing the state.
 */
export const observationStateSchema = z.enum([
  'present',
  'missing',
  'suppressed',
  'not-applicable',
]);
export type ObservationState = z.infer<typeof observationStateSchema>;

export const significanceSchema = z.enum([
  'not-compared', 'better', 'worse', 'similar', 'higher', 'lower',
]);
export type Significance = z.infer<typeof significanceSchema>;

export const trendFlagSchema = z.enum([
  'not-available', 'no-significant-change', 'increasing',
  'increasing-worse', 'decreasing', 'decreasing-better',
]);
export type TrendFlag = z.infer<typeof trendFlagSchema>;

interface ObservationCommon {
  readonly areaCode: string;
  readonly period: string;
  readonly sex: string;
  readonly age: string;
  readonly categoryType: string | null;
  readonly category: string | null;
  /** Source-provided comparison against England. Never computed here. */
  readonly significance: Significance;
  /** Source-provided trend flag. Never computed here. */
  readonly trend: TrendFlag;
  readonly note: string | null;
}

/** An observation with a real numeric value. Only this variant exposes `value`. */
export interface PresentObservation extends ObservationCommon {
  readonly state: 'present';
  readonly value: number;
  readonly lowerCi95: number | null;
  readonly upperCi95: number | null;
  readonly lowerCi998: number | null;
  readonly upperCi998: number | null;
  readonly count: number | null;
  readonly denominator: number | null;
}

/** Published geography, but no value supplied for it. */
export interface MissingObservation extends ObservationCommon {
  readonly state: 'missing';
}

/** Value withheld by the publisher under disclosure control. */
export interface SuppressedObservation extends ObservationCommon {
  readonly state: 'suppressed';
}

/** The measure does not apply to this area at all. */
export interface NotApplicableObservation extends ObservationCommon {
  readonly state: 'not-applicable';
}

export type Observation =
  | PresentObservation
  | MissingObservation
  | SuppressedObservation
  | NotApplicableObservation;

export function isPresent(o: Observation | undefined): o is PresentObservation {
  return o?.state === 'present';
}

export function hasInterval(
  o: Observation | undefined,
): o is PresentObservation & { lowerCi95: number; upperCi95: number } {
  return isPresent(o) && o.lowerCi95 !== null && o.upperCi95 !== null;
}

/**
 * Why an area has no value. Distinguishing these four is the difference between
 * "this place is doing well" and "we do not know about this place".
 */
export type UnavailableReason =
  | { kind: 'missing'; note: string | null }
  | { kind: 'suppressed'; note: string | null }
  | { kind: 'not-applicable'; note: string | null }
  | { kind: 'no-observation' }
  | { kind: 'outside-dataset-coverage'; nation: string };

/** The columnar wire format written by scripts/prepare-data/encode.mjs. */
export const encodedObservationsSchema = z.object({
  encoding: z.literal('columnar-v1'),
  rowCount: z.number().int().nonnegative(),
  dictionaries: z.object({
    areas: z.array(z.string()),
    periods: z.array(z.string()),
    sexes: z.array(z.string()),
    ages: z.array(z.string()),
    categoryTypes: z.array(z.string()),
    categories: z.array(z.string()),
    notes: z.array(z.string()),
  }),
  omittedColumns: z.array(z.string()),
  columns: z.object({
    area: z.array(z.number()),
    period: z.array(z.number()),
    sex: z.array(z.number()),
    age: z.array(z.number()),
    state: z.array(z.number()),
    value: z.array(z.number().nullable()),
    categoryType: z.array(z.number()).optional(),
    category: z.array(z.number()).optional(),
    lowerCi95: z.array(z.number().nullable()).optional(),
    upperCi95: z.array(z.number().nullable()).optional(),
    lowerCi998: z.array(z.number().nullable()).optional(),
    upperCi998: z.array(z.number().nullable()).optional(),
    count: z.array(z.number().nullable()).optional(),
    denominator: z.array(z.number().nullable()).optional(),
    significance: z.array(z.number()).optional(),
    trend: z.array(z.number()).optional(),
    note: z.array(z.number()).optional(),
  }),
});
export type EncodedObservations = z.infer<typeof encodedObservationsSchema>;
