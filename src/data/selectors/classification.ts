import type { Observation, PresentObservation } from '../schemas/observation';
import { isPresent } from '../schemas/observation';

export type ClassificationMethod = 'quantile' | 'equal-interval' | 'fixed';

export interface ClassBreak {
  readonly index: number;
  readonly lower: number;
  readonly upper: number;
  /** Inclusive of the lower bound; the top class is inclusive of its upper bound. */
  readonly count: number;
}

export interface Classification {
  readonly method: ClassificationMethod;
  readonly methodLabel: string;
  readonly classCount: number;
  readonly breaks: readonly ClassBreak[];
  /** Boundary values between classes, length = classCount - 1. */
  readonly boundaries: readonly number[];
  readonly min: number;
  readonly max: number;
  /** Areas that carried a value and so took part in the classification. */
  readonly classifiedCount: number;
  /** Set when the scale came from somewhere other than the displayed data. */
  readonly scaleSource: 'this-period' | 'fixed-reference';
  readonly scaleNote: string | null;
}

export const CLASSIFICATION_LABELS: Record<ClassificationMethod, string> = {
  quantile: 'Quantile (equal count)',
  'equal-interval': 'Equal interval',
  fixed: 'Fixed breaks',
};

const DEFAULT_CLASS_COUNT = 5;

/**
 * The documented default. Quantile with five classes is reproducible from the
 * published values alone and keeps class occupancy even, which is what makes a
 * choropleth readable for skewed health-rate distributions.
 */
export const DEFAULT_CLASSIFICATION: ClassificationMethod = 'quantile';

function quantileBoundaries(sorted: readonly number[], classCount: number): number[] {
  const boundaries: number[] = [];
  for (let i = 1; i < classCount; i += 1) {
    // Linear interpolation between order statistics (the "type 7" quantile),
    // stated here so the breakpoints can be reproduced outside this app.
    const position = (i / classCount) * (sorted.length - 1);
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);
    const weight = position - lowerIndex;
    boundaries.push(
      sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight,
    );
  }
  return boundaries;
}

function equalIntervalBoundaries(min: number, max: number, classCount: number): number[] {
  const step = (max - min) / classCount;
  return Array.from({ length: classCount - 1 }, (_, i) => min + step * (i + 1));
}

export interface ClassifyOptions {
  readonly method?: ClassificationMethod;
  readonly classCount?: number;
  /**
   * Supplied when class breaks must stay fixed — comparing two periods, or
   * holding a scale across small multiples. Changing the scale silently between
   * two maps the reader is comparing is a misreading waiting to happen.
   */
  readonly fixedBoundaries?: readonly number[];
  readonly fixedScaleNote?: string;
}

/**
 * Builds a classification from the observations that actually carry a value.
 * Missing, suppressed and not-applicable observations are excluded from the
 * scale entirely — they are styled separately, never placed in a value class.
 */
export function classify(
  observations: readonly Observation[],
  options: ClassifyOptions = {},
): Classification | null {
  const present: PresentObservation[] = observations.filter(isPresent);
  const values = present.map((o) => o.value).sort((a, b) => a - b);
  if (values.length === 0) return null;

  const min = values[0];
  const max = values[values.length - 1];

  if (options.fixedBoundaries && options.fixedBoundaries.length > 0) {
    const boundaries = [...options.fixedBoundaries].sort((a, b) => a - b);
    return assemble(
      'fixed', boundaries, values, min, max, 'fixed-reference',
      options.fixedScaleNote ??
        'Class breaks are held fixed so the two maps can be compared directly.',
    );
  }

  const classCount = Math.max(2, Math.min(9, options.classCount ?? DEFAULT_CLASS_COUNT));
  const method = options.method ?? DEFAULT_CLASSIFICATION;

  // A distribution with fewer distinct values than classes cannot support them.
  const distinct = new Set(values).size;
  if (distinct === 1) {
    return assemble('fixed', [], values, min, max, 'this-period',
      'Every area with a value shares the same value, so a single class is shown.');
  }
  const effectiveCount = Math.min(classCount, distinct);

  const boundaries = method === 'equal-interval'
    ? equalIntervalBoundaries(min, max, effectiveCount)
    : quantileBoundaries(values, effectiveCount);

  // Collapse duplicate boundaries produced by ties, so no empty class appears.
  const unique = [...new Set(boundaries.map((b) => Number(b.toFixed(10))))];

  return assemble(
    method, unique, values, min, max, 'this-period',
    effectiveCount < classCount
      ? `Reduced to ${unique.length + 1} classes: the data contain only ${distinct} distinct values.`
      : null,
  );
}

function assemble(
  method: ClassificationMethod,
  boundaries: readonly number[],
  sortedValues: readonly number[],
  min: number,
  max: number,
  scaleSource: Classification['scaleSource'],
  scaleNote: string | null,
): Classification {
  const edges = [min, ...boundaries, max];
  const breaks: ClassBreak[] = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const lower = edges[i];
    const upper = edges[i + 1];
    const isTop = i === edges.length - 2;
    const count = sortedValues.filter(
      (v) => v >= lower && (isTop ? v <= upper : v < upper),
    ).length;
    breaks.push({ index: i, lower, upper, count });
  }
  return {
    method,
    methodLabel: CLASSIFICATION_LABELS[method],
    classCount: breaks.length,
    breaks,
    boundaries,
    min,
    max,
    classifiedCount: sortedValues.length,
    scaleSource,
    scaleNote,
  };
}

/** Which class a value belongs to, or null when the value is outside the scale. */
export function classOf(classification: Classification, value: number): number | null {
  const { breaks } = classification;
  for (let i = 0; i < breaks.length; i += 1) {
    const isTop = i === breaks.length - 1;
    if (value >= breaks[i].lower && (isTop ? value <= breaks[i].upper : value < breaks[i].upper)) {
      return i;
    }
  }
  if (value < classification.min) return 0;
  if (value > classification.max) return breaks.length - 1;
  return null;
}
