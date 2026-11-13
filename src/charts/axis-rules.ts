import type { Indicator } from '@/data/schemas/manifest';

/**
 * Where a value axis starts is a property of the measure, not a user toggle.
 *
 * - `zero`: the measure is a rate, proportion, count or physical concentration
 *   whose zero means "none of it". Its magnitude is part of the message, so
 *   truncating the axis would make a modest change look dramatic.
 * - `fitted`: the measure has no meaningful zero in a population (nobody's life
 *   expectancy is near zero; a deprivation score is an index). A zero baseline
 *   would flatten real, important change into a straight line, so the axis is
 *   fitted to the data — and the chart always says so with a drawn axis break.
 */
export type Baseline = 'zero' | 'fitted';

export interface AxisRule {
  readonly baseline: Baseline;
  /** Shown in the design spec and available to any figure that wants to cite it. */
  readonly reason: string;
  /**
   * Smallest span a fitted axis may show, as a fraction of the typical level.
   * Stops a near-constant series from being magnified until noise looks like a cliff.
   */
  readonly minRelativeSpan: number;
}

const ZERO: AxisRule = {
  baseline: 'zero',
  reason: 'Rate, proportion or concentration: zero means none, so magnitude is part of the message.',
  minRelativeSpan: 0,
};

const FITTED_LEVEL: AxisRule = {
  baseline: 'fitted',
  reason: 'Level measure with no meaningful zero in a population: the axis is fitted and marked as broken.',
  minRelativeSpan: 0.02,
};

const FITTED_INDEX: AxisRule = {
  baseline: 'fitted',
  reason: 'Index score with no natural zero: the axis is fitted and marked as broken.',
  minRelativeSpan: 0.1,
};

/** Rules by the publisher's value type. Anything unlisted keeps a zero baseline. */
const BY_VALUE_TYPE: Readonly<Record<string, AxisRule>> = {
  'Life expectancy': FITTED_LEVEL,
  'Healthy life expectancy': FITTED_LEVEL,
  Score: FITTED_INDEX,
  'Directly standardised rate': ZERO,
  'Crude rate': ZERO,
  Proportion: ZERO,
  Count: ZERO,
  Mean: ZERO,
};

/**
 * Per-indicator overrides, keyed by Fingertips indicator ID, for measures whose
 * value type alone does not decide the question. Add an entry with a reason
 * rather than special-casing a chart.
 */
const BY_INDICATOR_ID: Readonly<Record<number, AxisRule>> = {};

export function axisRuleFor(indicator: Pick<Indicator, 'id' | 'valueType'>): AxisRule {
  return (
    BY_INDICATOR_ID[indicator.id] ??
    (indicator.valueType ? BY_VALUE_TYPE[indicator.valueType] : undefined) ??
    ZERO
  );
}

/** Step of a "nice" axis that gives roughly `count` intervals over the span. */
export function niceStep(span: number, count = 5): number {
  if (!Number.isFinite(span) || span <= 0) return 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  return (normalised >= 7.5 ? 10 : normalised >= 3.5 ? 5 : normalised >= 1.5 ? 2 : 1) * magnitude;
}

/**
 * The value domain for a level axis, snapped outward to nice tick values.
 *
 * Returns `broken: true` when the axis does not reach zero, so the renderer can
 * draw the break marker. A zero-baseline rule still extends below zero if the
 * data do (a negative value is never clipped).
 */
export function valueDomain(
  values: readonly number[],
  rule: AxisRule,
  tickCount = 5,
): { domain: [number, number]; step: number; broken: boolean } {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return { domain: [0, 1], step: 0.2, broken: false };

  let min = Math.min(...finite);
  let max = Math.max(...finite);

  if (rule.baseline === 'zero') {
    min = Math.min(0, min);
    max = Math.max(0, max);
  } else {
    const level = Math.abs((min + max) / 2) || 1;
    const minSpan = level * rule.minRelativeSpan;
    if (max - min < minSpan) {
      const centre = (min + max) / 2;
      min = centre - minSpan / 2;
      max = centre + minSpan / 2;
    }
    const pad = (max - min) * 0.08;
    min -= pad;
    max += pad;
  }
  if (min === max) {
    const nudge = Math.abs(min) * 0.1 || 1;
    min -= nudge;
    max += nudge;
  }

  const step = niceStep(max - min, tickCount);
  const lo = Math.floor(min / step + 1e-9) * step;
  const hi = Math.ceil(max / step - 1e-9) * step;
  // A fitted axis that happens to reach zero is not broken.
  return { domain: [lo, hi], step, broken: rule.baseline === 'fitted' && lo > 0 };
}
