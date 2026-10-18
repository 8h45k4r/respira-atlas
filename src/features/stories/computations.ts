import type { Indicator } from '@/data/schemas/manifest';
import type { Observation, PresentObservation, Significance } from '@/data/schemas/observation';
import { isPresent, hasInterval } from '@/data/schemas/observation';
import { formatValue, formatWithUnit } from '@/data/selectors/format';

/**
 * Findings for evidence stories.
 *
 * Every function here derives its numbers from the observations passed in. A
 * story authors the question and the framing; it never authors the answer. If
 * the data change, the story changes with them — and a story whose computation
 * returns null does not render, rather than falling back to a remembered figure.
 *
 * These are pure and unit-tested, for the same reason the rest of the
 * analytical layer is: a narrative is exactly where a quietly wrong number does
 * the most damage.
 */

export interface RangeSummary {
  readonly lowest: { areaCode: string; value: number };
  readonly highest: { areaCode: string; value: number };
  readonly ratio: number | null;
  readonly absoluteGap: number;
  readonly median: number;
  readonly count: number;
}

export function summariseRange(
  observations: readonly Observation[],
): RangeSummary | null {
  const present = observations.filter(isPresent);
  if (present.length < 3) return null;
  const sorted = [...present].sort((a, b) => a.value - b.value);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  return {
    lowest: { areaCode: lowest.areaCode, value: lowest.value },
    highest: { areaCode: highest.areaCode, value: highest.value },
    // A ratio against zero is undefined, not infinite. Callers must handle null.
    ratio: lowest.value === 0 ? null : highest.value / lowest.value,
    absoluteGap: highest.value - lowest.value,
    median: sorted[Math.floor(sorted.length / 2)].value,
    count: present.length,
  };
}

export interface SignificanceSummary {
  readonly counts: Readonly<Record<Significance, number>>;
  readonly compared: number;
  readonly indistinguishable: number;
  readonly differentFromBenchmark: number;
  /** Share of compared areas the publisher could not separate from England. */
  readonly indistinguishableShare: number | null;
}

/**
 * Counts the publisher's own comparison flags.
 *
 * This is the single most useful corrective to a colourful map: it answers
 * "how many of these differences are the publisher willing to call real?"
 * without this product computing a test of its own.
 */
export function summariseSignificance(
  observations: readonly Observation[],
): SignificanceSummary {
  const counts: Record<Significance, number> = {
    'not-compared': 0, better: 0, worse: 0, similar: 0, higher: 0, lower: 0,
  };
  for (const observation of observations) counts[observation.significance] += 1;

  const compared =
    counts.better + counts.worse + counts.similar + counts.higher + counts.lower;
  const indistinguishable = counts.similar;
  const differentFromBenchmark =
    counts.better + counts.worse + counts.higher + counts.lower;

  return {
    counts,
    compared,
    indistinguishable,
    differentFromBenchmark,
    indistinguishableShare: compared > 0 ? indistinguishable / compared : null,
  };
}

export interface AvailabilitySummary {
  readonly total: number;
  readonly present: number;
  readonly missing: number;
  readonly suppressed: number;
  readonly zeroValues: number;
  /** The publisher's own suppression wording, where it supplies one. */
  readonly suppressionNote: string | null;
}

export function summariseAvailability(
  observations: readonly Observation[],
): AvailabilitySummary {
  const suppressed = observations.filter((o) => o.state === 'suppressed');
  return {
    total: observations.length,
    present: observations.filter(isPresent).length,
    missing: observations.filter((o) => o.state === 'missing').length,
    suppressed: suppressed.length,
    // A value of zero is a published value. It is counted separately only so a
    // story can point at it; it is never counted as missing.
    zeroValues: observations.filter((o) => isPresent(o) && o.value === 0).length,
    suppressionNote: suppressed.find((o) => o.note)?.note ?? null,
  };
}

export interface PrecisionSummary {
  readonly withInterval: number;
  /** Median width of the 95% interval as a percentage of the estimate. */
  readonly medianRelativeWidth: number | null;
  readonly widest: { areaCode: string; relativeWidth: number } | null;
  readonly narrowest: { areaCode: string; relativeWidth: number } | null;
}

/**
 * How precise the estimates are, in relative terms.
 *
 * Expressed as a share of the estimate rather than in the measure's own units,
 * because that is the form in which precision is comparable between indicators
 * — which is the whole point of mentioning it in a story.
 */
export function summarisePrecision(
  observations: readonly Observation[],
): PrecisionSummary {
  const withInterval = observations
    .filter(hasInterval)
    .filter((o) => o.value !== 0)
    .map((o) => ({
      areaCode: o.areaCode,
      relativeWidth: ((o.upperCi95 - o.lowerCi95) / o.value) * 100,
    }))
    .sort((a, b) => a.relativeWidth - b.relativeWidth);

  if (withInterval.length === 0) {
    return { withInterval: 0, medianRelativeWidth: null, widest: null, narrowest: null };
  }
  return {
    withInterval: withInterval.length,
    medianRelativeWidth: withInterval[Math.floor(withInterval.length / 2)].relativeWidth,
    widest: withInterval[withInterval.length - 1],
    narrowest: withInterval[0],
  };
}

export interface OverlapSummary {
  readonly comparable: number;
  /** Pairs whose 95% intervals overlap, among the extremes examined. */
  readonly extremesOverlap: boolean | null;
  readonly lowest: PresentObservation | null;
  readonly highest: PresentObservation | null;
}

/**
 * Whether the two ends of the distribution have overlapping intervals.
 *
 * Reported as a description of the intervals. Overlap is not a significance
 * test and non-overlap is not proof of a difference; stories that use this say
 * so in the same breath.
 */
export function summariseExtremeOverlap(
  observations: readonly Observation[],
): OverlapSummary {
  const withInterval = observations.filter(hasInterval);
  if (withInterval.length < 2) {
    return { comparable: withInterval.length, extremesOverlap: null, lowest: null, highest: null };
  }
  const sorted = [...withInterval].sort((a, b) => a.value - b.value);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  return {
    comparable: withInterval.length,
    extremesOverlap:
      lowest.upperCi95 >= highest.lowerCi95 && highest.upperCi95 >= lowest.lowerCi95,
    lowest,
    highest,
  };
}

export interface PairedAreas {
  readonly period: string;
  readonly pairs: readonly { areaCode: string; x: number; y: number }[];
  readonly onlyX: number;
  readonly onlyY: number;
}

/**
 * Areas with a published value for both measures in the same period.
 *
 * The shared period is required, not merely preferred: pairing an outcome in
 * one period with an exposure in another manufactures a relationship out of a
 * mismatch. Returns null when no period is shared.
 */
export function pairAreas(
  xObservations: readonly Observation[],
  yObservations: readonly Observation[],
  xPeriods: readonly string[],
  yPeriods: readonly string[],
): PairedAreas | null {
  const shared = xPeriods.filter((period) => yPeriods.includes(period));
  if (shared.length === 0) return null;
  const period = shared[shared.length - 1];

  const xByArea = new Map(
    xObservations.filter((o) => o.period === period).filter(isPresent)
      .map((o) => [o.areaCode, o.value]),
  );
  const yByArea = new Map(
    yObservations.filter((o) => o.period === period).filter(isPresent)
      .map((o) => [o.areaCode, o.value]),
  );

  const pairs: { areaCode: string; x: number; y: number }[] = [];
  for (const [areaCode, x] of xByArea) {
    const y = yByArea.get(areaCode);
    if (y !== undefined) pairs.push({ areaCode, x, y });
  }
  return {
    period,
    pairs,
    onlyX: xByArea.size - pairs.length,
    onlyY: yByArea.size - pairs.length,
  };
}

export interface GroupGap {
  readonly group: string;
  readonly value: number;
  readonly lowerCi95: number | null;
  readonly upperCi95: number | null;
}

export interface GroupGapSummary {
  readonly groups: readonly GroupGap[];
  readonly gap: number;
  readonly highest: GroupGap;
  readonly lowest: GroupGap;
  readonly intervalsOverlap: boolean | null;
}

/**
 * The difference between published population groups for one area and period.
 *
 * Reports the size of the gap only. A gap between groups describes the gap; it
 * does not explain it, and these groups differ in many ways besides the one
 * they are labelled by.
 */
export function summariseGroupGap(
  observations: readonly Observation[],
): GroupGapSummary | null {
  const present = observations.filter(isPresent);
  if (present.length < 2) return null;

  const groups: GroupGap[] = present.map((o) => ({
    group: o.sex,
    value: o.value,
    lowerCi95: o.lowerCi95,
    upperCi95: o.upperCi95,
  }));
  const sorted = [...groups].sort((a, b) => a.value - b.value);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];

  const bothHaveIntervals =
    lowest.lowerCi95 !== null && lowest.upperCi95 !== null &&
    highest.lowerCi95 !== null && highest.upperCi95 !== null;

  return {
    groups,
    gap: highest.value - lowest.value,
    highest,
    lowest,
    intervalsOverlap: bothHaveIntervals
      ? lowest.upperCi95! >= highest.lowerCi95! && highest.upperCi95! >= lowest.lowerCi95!
      : null,
  };
}

/** Formats a share as a readable percentage without implying false precision. */
export function formatShare(share: number): string {
  const percent = share * 100;
  if (percent >= 99.5) return 'almost all';
  if (percent >= 10) return `${Math.round(percent)}%`;
  return `${percent.toFixed(1)}%`;
}

export function formatRatio(ratio: number): string {
  return ratio >= 10 ? `${Math.round(ratio)}-fold` : `${ratio.toFixed(1)}-fold`;
}

export { formatValue, formatWithUnit };
export type { Indicator };
