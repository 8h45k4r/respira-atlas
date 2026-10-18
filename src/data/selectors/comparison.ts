import type { Indicator, GeographyAvailability } from '../schemas/manifest';
import type { Observation, PresentObservation, Significance } from '../schemas/observation';
import { isPresent, hasInterval } from '../schemas/observation';
import { isPercentageMeasure } from './format';

/** Why two observations may not be compared. */
export type IncompatibilityReason =
  | { kind: 'different-period'; a: string; b: string }
  | { kind: 'different-geography'; a: string; b: string }
  | { kind: 'different-boundary-vintage'; a: string; b: string }
  | { kind: 'different-period-pooling'; a: string; b: string }
  | { kind: 'different-subgroup'; a: string; b: string }
  | { kind: 'value-unavailable'; areaCode: string; state: Observation['state'] };

export interface CompatibilityResult {
  readonly compatible: boolean;
  readonly reasons: readonly IncompatibilityReason[];
}

export interface ComparableContext {
  readonly areaTypeKey: string;
  readonly boundaryVintage: string;
  readonly period: string;
  readonly periodRange: string;
  readonly sex: string;
  readonly age: string;
}

/**
 * Gate for every comparison the product offers. Two observations are comparable
 * only when geography, boundary vintage, period, period pooling and population
 * subgroup all agree. Nothing downstream computes a difference without this.
 */
export function checkComparable(
  a: ComparableContext,
  b: ComparableContext,
): CompatibilityResult {
  const reasons: IncompatibilityReason[] = [];
  if (a.areaTypeKey !== b.areaTypeKey) {
    reasons.push({ kind: 'different-geography', a: a.areaTypeKey, b: b.areaTypeKey });
  }
  if (a.boundaryVintage !== b.boundaryVintage) {
    reasons.push({
      kind: 'different-boundary-vintage', a: a.boundaryVintage, b: b.boundaryVintage,
    });
  }
  if (a.period !== b.period) {
    reasons.push({ kind: 'different-period', a: a.period, b: b.period });
  }
  if (a.periodRange !== b.periodRange) {
    reasons.push({ kind: 'different-period-pooling', a: a.periodRange, b: b.periodRange });
  }
  if (a.sex !== b.sex || a.age !== b.age) {
    reasons.push({
      kind: 'different-subgroup', a: `${a.sex}, ${a.age}`, b: `${b.sex}, ${b.age}`,
    });
  }
  return { compatible: reasons.length === 0, reasons };
}

export function describeIncompatibility(reason: IncompatibilityReason): string {
  switch (reason.kind) {
    case 'different-period':
      return `Different periods (${reason.a} and ${reason.b}). Comparing them would mix time with place.`;
    case 'different-geography':
      return `Different geography types (${reason.a} and ${reason.b}). These areas do not nest and are not interchangeable.`;
    case 'different-boundary-vintage':
      return `Different boundary vintages (${reason.a} and ${reason.b}). The areas do not describe the same territory.`;
    case 'different-period-pooling':
      return `Different period pooling (${reason.a} and ${reason.b}). A pooled multi-year figure is not comparable with a single year.`;
    case 'different-subgroup':
      return `Different population subgroups (${reason.a} and ${reason.b}).`;
    case 'value-unavailable':
      return `${reason.areaCode} has no value for this selection (${reason.state}).`;
  }
}

export interface BenchmarkComparison {
  readonly area: PresentObservation;
  readonly benchmark: PresentObservation;
  readonly benchmarkLabel: string;
  /** Absolute difference in the measure's own unit. */
  readonly absoluteDifference: number;
  /**
   * Percentage-point difference. Only set for percentage measures, where
   * subtracting two percentages yields a percentage point.
   */
  readonly percentagePointDifference: number | null;
  /**
   * Relative difference as a percentage of the benchmark. Only set when the
   * benchmark is non-zero, and always labelled as relative.
   */
  readonly relativeDifferencePercent: number | null;
  readonly direction: 'higher' | 'lower' | 'equal';
  /** Source-provided flag. This product never derives significance itself. */
  readonly sourceSignificance: Significance;
  /**
   * Whether the area's interval contains the benchmark value. Reported as a
   * descriptive observation about the interval, NOT as a hypothesis test.
   */
  readonly intervalContainsBenchmark: boolean | null;
}

export function compareToBenchmark(
  area: Observation | undefined,
  benchmark: Observation | undefined,
  benchmarkLabel: string,
  indicator: Pick<Indicator, 'unit' | 'valueType'>,
): BenchmarkComparison | null {
  if (!isPresent(area) || !isPresent(benchmark)) return null;

  const absoluteDifference = area.value - benchmark.value;
  const direction =
    absoluteDifference > 0 ? 'higher' : absoluteDifference < 0 ? 'lower' : 'equal';

  return {
    area,
    benchmark,
    benchmarkLabel,
    absoluteDifference,
    percentagePointDifference: isPercentageMeasure(indicator) ? absoluteDifference : null,
    relativeDifferencePercent:
      benchmark.value !== 0 ? (absoluteDifference / benchmark.value) * 100 : null,
    direction,
    sourceSignificance: area.significance,
    intervalContainsBenchmark: hasInterval(area)
      ? area.lowerCi95 <= benchmark.value && benchmark.value <= area.upperCi95
      : null,
  };
}

/**
 * Whether a better/worse reading is permitted at all.
 *
 * Recorded prevalence measures (QOF registers, for instance) are not
 * interpretable as better or worse, because a higher recorded figure can mean
 * better ascertainment rather than more disease.
 */
export function allowsQualitativeReading(
  indicator: Pick<Indicator, 'direction'>,
): boolean {
  return indicator.direction !== 'not-interpretable';
}

export interface RankingEntry {
  readonly areaCode: string;
  readonly areaName: string;
  readonly observation: Observation;
  /** 1-based, among areas with a value only. Null when the area has no value. */
  readonly rank: number | null;
  readonly outOf: number;
}

/**
 * Ranks areas by value. Presented as a position in a distribution, never as a
 * performance league table: callers must render the uncertainty alongside and
 * the UI states that neighbouring ranks are usually indistinguishable.
 */
export function rankAreas(
  observations: readonly Observation[],
  areaNames: ReadonlyMap<string, string>,
  direction: 'ascending' | 'descending' = 'descending',
): RankingEntry[] {
  const present = observations.filter(isPresent);
  const sorted = [...present].sort((a, b) =>
    direction === 'descending' ? b.value - a.value : a.value - b.value,
  );
  const rankByCode = new Map(sorted.map((o, i) => [o.areaCode, i + 1]));
  return observations.map((o) => ({
    areaCode: o.areaCode,
    areaName: areaNames.get(o.areaCode) ?? o.areaCode,
    observation: o,
    rank: rankByCode.get(o.areaCode) ?? null,
    outOf: sorted.length,
  }));
}

/**
 * Do two intervals overlap?
 *
 * Exposed for display only. Overlapping intervals are NOT a significance test
 * and non-overlap is not proof of a difference; callers must label this as a
 * visual aid. See docs/METHODS.md.
 */
export function intervalsOverlap(a: Observation, b: Observation): boolean | null {
  if (!hasInterval(a) || !hasInterval(b)) return null;
  return a.lowerCi95 <= b.upperCi95 && b.lowerCi95 <= a.upperCi95;
}

/** Period comparison is blocked unless both periods come from the same series. */
export function canComparePeriods(
  availability: Pick<GeographyAvailability, 'periodSeries'>,
  periodA: string,
  periodB: string,
): { allowed: boolean; reason: string | null } {
  const seriesOf = (period: string) =>
    availability.periodSeries.find((s) =>
      // periodSeries in the manifest carries counts only; the observation file
      // carries the period lists, so callers pass matching series here.
      s.latestPeriod === period || s.range === period,
    );
  const a = seriesOf(periodA);
  const b = seriesOf(periodB);
  if (a && b && a.range !== b.range) {
    return {
      allowed: false,
      reason:
        `${periodA} and ${periodB} come from different period series ` +
        `(${a.label} and ${b.label}) and are not directly comparable.`,
    };
  }
  return { allowed: true, reason: null };
}
