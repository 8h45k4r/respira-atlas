import type { Observation, PresentObservation } from '@/data/schemas/observation';
import { isPresent } from '@/data/schemas/observation';

/**
 * The confidence level behind the publisher's England flag.
 *
 * Fingertips compares each area with England by asking whether England's value
 * lies inside the area's confidence interval, but not every indicator uses the
 * same level: most use 95%, while some (GP-register prevalence for
 * hypertension, depression and asthma, for example) use 99.8%. The level is not
 * carried in the indicator metadata this atlas retrieves, so it is read off the
 * data: the level at which the published flag and the published interval agree
 * for every compared area.
 *
 * Nothing here recomputes a flag. The publisher's flag is always the one shown;
 * this only decides which published interval to draw beside it, so a bar and a
 * dot can never tell the reader two different things.
 */
export type IntervalLevel = 95 | 99.8;

export interface FlagLevel {
  /** The level to draw beside the flag. Null when nothing was compared. */
  readonly level: IntervalLevel | null;
  /**
   * - `exact`: the flag agrees with the interval at `level` for every compared row.
   * - `approximate`: no level agrees everywhere; `level` is the closer one, and
   *   no figure may present the interval as the basis of the flag.
   * - `none`: no row carries both a flag and an interval.
   */
  readonly basis: 'exact' | 'approximate' | 'none';
  /** Rows with a flag, an interval and a benchmark value. */
  readonly compared: number;
  /** Share of compared rows that agree at `level` (0 to 1). */
  readonly agreement: number;
}

export const NO_FLAG_LEVEL: FlagLevel = { level: null, basis: 'none', compared: 0, agreement: 0 };

export function intervalAt(
  observation: PresentObservation,
  level: IntervalLevel,
): { lower: number; upper: number } | null {
  const lower = level === 95 ? observation.lowerCi95 : observation.lowerCi998;
  const upper = level === 95 ? observation.upperCi95 : observation.upperCi998;
  return lower !== null && upper !== null ? { lower, upper } : null;
}

export function intervalContains(
  observation: PresentObservation, level: IntervalLevel, value: number,
): boolean | null {
  const interval = intervalAt(observation, level);
  return interval ? interval.lower <= value && value <= interval.upper : null;
}

function benchmarkKey(o: Observation): string {
  return `${o.period}|${o.sex}|${o.age}|${o.categoryType ?? ''}|${o.category ?? ''}`;
}

export function inferFlagLevel(
  observations: readonly Observation[],
  benchmark: readonly Observation[],
): FlagLevel {
  const benchmarkValue = new Map<string, number>();
  for (const o of benchmark) if (isPresent(o)) benchmarkValue.set(benchmarkKey(o), o.value);

  let compared = 0;
  let agree95 = 0;
  let with998 = 0;
  let agree998 = 0;

  for (const o of observations) {
    if (!isPresent(o) || o.significance === 'not-compared') continue;
    const england = benchmarkValue.get(benchmarkKey(o));
    if (england === undefined) continue;
    const inside95 = intervalContains(o, 95, england);
    if (inside95 === null) continue;

    const flaggedDifferent = o.significance !== 'similar';
    compared += 1;
    if (!inside95 === flaggedDifferent) agree95 += 1;

    const inside998 = intervalContains(o, 99.8, england);
    if (inside998 !== null) {
      with998 += 1;
      if (!inside998 === flaggedDifferent) agree998 += 1;
    }
  }

  if (compared === 0) return NO_FLAG_LEVEL;

  // 95% wins a tie: when both levels agree everywhere, the 95% bar can never
  // contradict the flag, and it is the interval readers see elsewhere.
  if (agree95 === compared) return { level: 95, basis: 'exact', compared, agreement: 1 };
  if (with998 === compared && agree998 === compared) {
    return { level: 99.8, basis: 'exact', compared, agreement: 1 };
  }

  const share95 = agree95 / compared;
  const share998 = with998 > 0 ? agree998 / with998 : 0;
  return share998 > share95
    ? { level: 99.8, basis: 'approximate', compared, agreement: share998 }
    : { level: 95, basis: 'approximate', compared, agreement: share95 };
}
