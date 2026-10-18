import { describe, it, expect } from 'vitest';
import {
  checkComparable, compareToBenchmark, allowsQualitativeReading,
  intervalsOverlap, rankAreas, describeIncompatibility,
} from '@/data/selectors/comparison';
import { makeIndicator, present, nonPresent } from './fixtures';

const base = {
  areaTypeKey: 'icb22',
  boundaryVintage: 'July 2022',
  period: '2024/25',
  periodRange: '1y',
  sex: 'Persons',
  age: 'All ages',
};

describe('comparability gate', () => {
  it('accepts identical context', () => {
    expect(checkComparable(base, { ...base }).compatible).toBe(true);
  });

  it('blocks different periods', () => {
    const result = checkComparable(base, { ...base, period: '2023/24' });
    expect(result.compatible).toBe(false);
    expect(result.reasons[0].kind).toBe('different-period');
  });

  it('blocks a pooled period against a single year', () => {
    const result = checkComparable(base, { ...base, periodRange: '3y' });
    expect(result.compatible).toBe(false);
    expect(result.reasons.map((r) => r.kind)).toContain('different-period-pooling');
  });

  it('blocks incompatible boundary vintages', () => {
    const result = checkComparable(base, { ...base, boundaryVintage: 'April 2023' });
    expect(result.compatible).toBe(false);
    expect(result.reasons.map((r) => r.kind)).toContain('different-boundary-vintage');
    expect(describeIncompatibility(result.reasons[0])).toMatch(/same territory/i);
  });

  it('blocks mixing NHS and administrative geography', () => {
    const result = checkComparable(base, { ...base, areaTypeKey: 'ctyua23' });
    expect(result.compatible).toBe(false);
    expect(result.reasons.map((r) => r.kind)).toContain('different-geography');
    expect(describeIncompatibility(result.reasons[0])).toMatch(/do not nest/i);
  });

  it('blocks different population subgroups', () => {
    expect(checkComparable(base, { ...base, sex: 'Male' }).compatible).toBe(false);
  });
});

describe('benchmark comparison', () => {
  const indicator = makeIndicator();

  it('computes an absolute difference in the measure unit', () => {
    const result = compareToBenchmark(present(120), present(100), 'England', indicator)!;
    expect(result.absoluteDifference).toBeCloseTo(20);
    expect(result.direction).toBe('higher');
    expect(result.relativeDifferencePercent).toBeCloseTo(20);
  });

  it('withholds percentage points for a rate measure', () => {
    const result = compareToBenchmark(present(120), present(100), 'England', indicator)!;
    expect(result.percentagePointDifference).toBeNull();
  });

  it('supplies percentage points for a true percentage measure', () => {
    const pct = makeIndicator({ unit: '%', valueType: 'Proportion' });
    const result = compareToBenchmark(present(12), present(10), 'England', pct)!;
    expect(result.percentagePointDifference).toBeCloseTo(2);
  });

  it('refuses a relative difference against a zero benchmark', () => {
    const result = compareToBenchmark(present(5), present(0), 'England', indicator)!;
    expect(result.relativeDifferencePercent).toBeNull();
    expect(result.absoluteDifference).toBe(5);
  });

  it('returns null when either side has no value', () => {
    expect(compareToBenchmark(nonPresent('suppressed'), present(10), 'England', indicator)).toBeNull();
    expect(compareToBenchmark(present(10), nonPresent('missing'), 'England', indicator)).toBeNull();
    expect(compareToBenchmark(undefined, present(10), 'England', indicator)).toBeNull();
  });

  it('treats zero as a real value, not as missing', () => {
    const result = compareToBenchmark(present(0), present(10), 'England', indicator);
    expect(result).not.toBeNull();
    expect(result!.area.value).toBe(0);
    expect(result!.direction).toBe('lower');
  });

  it('reports whether the interval contains the benchmark without testing it', () => {
    const inside = compareToBenchmark(
      present(105, { lowerCi95: 95, upperCi95: 115 }), present(100), 'England', indicator,
    )!;
    expect(inside.intervalContainsBenchmark).toBe(true);
    const outside = compareToBenchmark(
      present(130, { lowerCi95: 120, upperCi95: 140 }), present(100), 'England', indicator,
    )!;
    expect(outside.intervalContainsBenchmark).toBe(false);
    const unknown = compareToBenchmark(present(130), present(100), 'England', indicator)!;
    expect(unknown.intervalContainsBenchmark).toBeNull();
  });

  it('passes through the source significance flag rather than deriving one', () => {
    const result = compareToBenchmark(
      present(130, { significance: 'worse' }), present(100), 'England', indicator,
    )!;
    expect(result.sourceSignificance).toBe('worse');
  });
});

describe('interpretation guards', () => {
  it('blocks better/worse language for recorded-prevalence measures', () => {
    expect(allowsQualitativeReading(makeIndicator({ direction: 'not-interpretable' }))).toBe(false);
    expect(allowsQualitativeReading(makeIndicator({ direction: 'low-is-good' }))).toBe(true);
  });

  it('reports interval overlap only when both intervals exist', () => {
    expect(intervalsOverlap(
      present(10, { lowerCi95: 5, upperCi95: 15 }),
      present(12, { lowerCi95: 11, upperCi95: 20 }),
    )).toBe(true);
    expect(intervalsOverlap(
      present(10, { lowerCi95: 5, upperCi95: 8 }),
      present(12, { lowerCi95: 11, upperCi95: 20 }),
    )).toBe(false);
    expect(intervalsOverlap(present(10), present(12))).toBeNull();
  });
});

describe('ranking', () => {
  it('ranks only areas with values and reports the denominator', () => {
    const observations = [
      present(50, { areaCode: 'E54000001' }),
      present(70, { areaCode: 'E54000002' }),
      nonPresent('suppressed', { areaCode: 'E54000003' }),
    ];
    const names = new Map([
      ['E54000001', 'Alpha'], ['E54000002', 'Beta'], ['E54000003', 'Gamma'],
    ]);
    const ranked = rankAreas(observations, names, 'descending');
    expect(ranked.find((r) => r.areaCode === 'E54000002')!.rank).toBe(1);
    expect(ranked.find((r) => r.areaCode === 'E54000001')!.rank).toBe(2);
    expect(ranked.find((r) => r.areaCode === 'E54000003')!.rank).toBeNull();
    expect(ranked[0].outOf).toBe(2);
  });
});
