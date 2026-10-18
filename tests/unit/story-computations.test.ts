import { describe, it, expect } from 'vitest';
import {
  summariseRange, summariseSignificance, summariseAvailability,
  summarisePrecision, summariseExtremeOverlap, pairAreas, summariseGroupGap,
  formatShare, formatRatio,
} from '@/features/stories/computations';
import { present, nonPresent } from './fixtures';

const area = (i: number) => `E0600${String(i).padStart(4, '0')}`;

describe('range summary', () => {
  const observations = [10, 20, 30, 40, 70].map((v, i) =>
    present(v, { areaCode: area(i) }),
  );

  it('reports the extremes, the gap and the ratio', () => {
    const result = summariseRange(observations)!;
    expect(result.lowest.value).toBe(10);
    expect(result.highest.value).toBe(70);
    expect(result.ratio).toBeCloseTo(7);
    expect(result.absoluteGap).toBe(60);
    expect(result.median).toBe(30);
    expect(result.count).toBe(5);
  });

  it('refuses a ratio against zero rather than reporting infinity', () => {
    const withZero = [0, 5, 9].map((v, i) => present(v, { areaCode: area(i) }));
    const result = summariseRange(withZero)!;
    expect(result.ratio).toBeNull();
    expect(result.absoluteGap).toBe(9);
    expect(Number.isFinite(result.absoluteGap)).toBe(true);
  });

  it('ignores observations without a value', () => {
    const mixed = [...observations, nonPresent('suppressed', { areaCode: area(9) })];
    expect(summariseRange(mixed)!.count).toBe(5);
  });

  it('returns null when there is too little to summarise', () => {
    expect(summariseRange([present(1), present(2)])).toBeNull();
    expect(summariseRange([])).toBeNull();
  });
});

describe('significance summary', () => {
  it('separates compared from not-compared, and similar from different', () => {
    const observations = [
      ...Array.from({ length: 124 }, (_, i) =>
        present(1, { areaCode: area(i), significance: 'similar' })),
      ...Array.from({ length: 6 }, (_, i) =>
        present(1, { areaCode: area(200 + i), significance: 'worse' })),
      ...Array.from({ length: 5 }, (_, i) =>
        present(1, { areaCode: area(300 + i), significance: 'better' })),
      ...Array.from({ length: 18 }, (_, i) =>
        nonPresent('suppressed', { areaCode: area(400 + i) })),
    ];
    const result = summariseSignificance(observations);
    expect(result.compared).toBe(135);
    expect(result.indistinguishable).toBe(124);
    expect(result.differentFromBenchmark).toBe(11);
    expect(result.counts['not-compared']).toBe(18);
    expect(result.indistinguishableShare).toBeCloseTo(124 / 135);
  });

  it('reports no share when nothing was compared', () => {
    const result = summariseSignificance([nonPresent('missing')]);
    expect(result.compared).toBe(0);
    expect(result.indistinguishableShare).toBeNull();
  });
});

describe('availability summary', () => {
  it('counts the four states apart and keeps zero as a value', () => {
    const observations = [
      present(0, { areaCode: area(1) }),
      present(5, { areaCode: area(2) }),
      nonPresent('missing', { areaCode: area(3) }),
      nonPresent('suppressed', { areaCode: area(4), note: 'Too small to publish' }),
      nonPresent('suppressed', { areaCode: area(5) }),
    ];
    const result = summariseAvailability(observations);
    expect(result.total).toBe(5);
    expect(result.present).toBe(2);
    expect(result.missing).toBe(1);
    expect(result.suppressed).toBe(2);
    expect(result.zeroValues).toBe(1);
    expect(result.suppressionNote).toBe('Too small to publish');
  });

  it('never counts a zero as missing', () => {
    const result = summariseAvailability([present(0)]);
    expect(result.present).toBe(1);
    expect(result.missing).toBe(0);
  });
});

describe('precision summary', () => {
  it('expresses interval width relative to the estimate', () => {
    const observations = [
      present(100, { areaCode: area(1), lowerCi95: 90, upperCi95: 110 }),
      present(10, { areaCode: area(2), lowerCi95: 2, upperCi95: 18 }),
      present(50, { areaCode: area(3), lowerCi95: 45, upperCi95: 55 }),
    ];
    const result = summarisePrecision(observations);
    expect(result.withInterval).toBe(3);
    expect(result.widest!.areaCode).toBe(area(2));
    expect(result.widest!.relativeWidth).toBeCloseTo(160);
    expect(result.narrowest!.relativeWidth).toBeCloseTo(20);
    expect(result.medianRelativeWidth).toBeCloseTo(20);
  });

  it('skips observations with no interval', () => {
    expect(summarisePrecision([present(10)]).withInterval).toBe(0);
    expect(summarisePrecision([present(10)]).medianRelativeWidth).toBeNull();
  });
});

describe('extreme overlap', () => {
  it('reports overlap between the ends of the distribution', () => {
    const wide = [
      present(10, { areaCode: area(1), lowerCi95: 2, upperCi95: 40 }),
      present(30, { areaCode: area(2), lowerCi95: 12, upperCi95: 60 }),
    ];
    expect(summariseExtremeOverlap(wide).extremesOverlap).toBe(true);

    const separated = [
      present(10, { areaCode: area(1), lowerCi95: 8, upperCi95: 12 }),
      present(30, { areaCode: area(2), lowerCi95: 28, upperCi95: 33 }),
    ];
    expect(summariseExtremeOverlap(separated).extremesOverlap).toBe(false);
  });

  it('reports nothing when intervals are absent', () => {
    expect(summariseExtremeOverlap([present(1), present(2)]).extremesOverlap).toBeNull();
  });
});

describe('pairing two measures', () => {
  const x = [
    present(1, { areaCode: area(1), period: '2024/25' }),
    present(2, { areaCode: area(2), period: '2024/25' }),
    present(9, { areaCode: area(3), period: '2023/24' }),
  ];
  const y = [
    present(10, { areaCode: area(1), period: '2024/25' }),
    present(20, { areaCode: area(2), period: '2024/25' }),
    present(30, { areaCode: area(9), period: '2024/25' }),
  ];

  it('pairs only areas with both values in a shared period', () => {
    const result = pairAreas(x, y, ['2023/24', '2024/25'], ['2024/25'])!;
    expect(result.period).toBe('2024/25');
    expect(result.pairs).toHaveLength(2);
    expect(result.onlyY).toBe(1);
  });

  it('refuses to pair when no period is shared', () => {
    expect(pairAreas(x, y, ['2019/20'], ['2024/25'])).toBeNull();
  });

  it('excludes areas whose value is missing on either side', () => {
    const withGap = [...x, nonPresent('suppressed', { areaCode: area(9), period: '2024/25' })];
    const result = pairAreas(withGap, y, ['2024/25'], ['2024/25'])!;
    expect(result.pairs.map((p) => p.areaCode)).not.toContain(area(9));
  });
});

describe('group gap', () => {
  it('reports the gap and whether the intervals overlap', () => {
    const result = summariseGroupGap([
      present(79.1, { sex: 'Male', lowerCi95: 78.9, upperCi95: 79.3 }),
      present(83.0, { sex: 'Female', lowerCi95: 82.8, upperCi95: 83.2 }),
    ])!;
    expect(result.gap).toBeCloseTo(3.9);
    expect(result.highest.group).toBe('Female');
    expect(result.lowest.group).toBe('Male');
    expect(result.intervalsOverlap).toBe(false);
  });

  it('returns null with fewer than two published groups', () => {
    expect(summariseGroupGap([present(79)])).toBeNull();
    expect(summariseGroupGap([nonPresent('suppressed'), present(79)])).toBeNull();
  });
});

describe('formatting helpers', () => {
  it('avoids false precision in shares', () => {
    expect(formatShare(0.918)).toBe('92%');
    expect(formatShare(0.04)).toBe('4.0%');
    expect(formatShare(0.999)).toBe('almost all');
  });

  it('formats ratios readably', () => {
    expect(formatRatio(3.88)).toBe('3.9-fold');
    expect(formatRatio(12.4)).toBe('12-fold');
  });
});
