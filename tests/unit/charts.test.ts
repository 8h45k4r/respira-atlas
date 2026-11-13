import { describe, it, expect } from 'vitest';
import { axisRuleFor, valueDomain } from '@/charts/axis-rules';
import { rankByValue, rankWindow, rankExtremes } from '@/data/selectors/ranking';
import { renderTimeSeriesSvg, renderDotWhiskerSvg, type TimeSeriesLine } from '@/export/chart-svg';
import { buildTrendLines } from '@/charts/trend-lines';
import { selectionOrder } from '@/charts/palette';
import type { ObservationSet } from '@/data/loader';
import type { Observation } from '@/data/schemas/observation';
import { makeIndicator, present } from './fixtures';

const lifeExpectancy = makeIndicator({
  id: 90366, name: 'Life expectancy at birth', shortName: 'Life expectancy at birth',
  unit: 'Years', valueType: 'Life expectancy',
});
const admissions = makeIndicator();
const deprivation = makeIndicator({ id: 94240, unit: null, valueType: 'Score' });

describe('per-indicator axis rule', () => {
  it('fits level measures and keeps zero for rates and proportions', () => {
    expect(axisRuleFor(lifeExpectancy).baseline).toBe('fitted');
    expect(axisRuleFor(deprivation).baseline).toBe('fitted');
    expect(axisRuleFor(admissions).baseline).toBe('zero');
    expect(axisRuleFor(makeIndicator({ unit: '%', valueType: 'Proportion' })).baseline).toBe('zero');
    // An unknown value type falls back to the conservative zero baseline.
    expect(axisRuleFor(makeIndicator({ valueType: 'Something new' })).baseline).toBe('zero');
  });

  it('reports a broken axis only when a fitted axis stops short of zero', () => {
    const fitted = valueDomain([81.2, 82.9, 83.5], axisRuleFor(lifeExpectancy));
    expect(fitted.broken).toBe(true);
    expect(fitted.domain[0]).toBeGreaterThan(70);
    expect(fitted.domain[0]).toBeLessThanOrEqual(81.2);
    expect(fitted.domain[1]).toBeGreaterThanOrEqual(83.5);

    const zero = valueDomain([410, 520], axisRuleFor(admissions));
    expect(zero.domain[0]).toBe(0);
    expect(zero.broken).toBe(false);
  });

  it('does not magnify a near-flat level series into a cliff', () => {
    const { domain } = valueDomain([82.40, 82.45], axisRuleFor(lifeExpectancy));
    // At least 2% of the level (about 1.6 years) is always shown.
    expect(domain[1] - domain[0]).toBeGreaterThanOrEqual(82.4 * 0.02);
  });

  it('never clips a negative value under a zero baseline', () => {
    const { domain } = valueDomain([-3, 5], axisRuleFor(admissions));
    expect(domain[0]).toBeLessThanOrEqual(-3);
  });
});

describe('ranking', () => {
  const observations = [
    present(10, { areaCode: 'A' }), present(30, { areaCode: 'B' }),
    present(20, { areaCode: 'C' }), present(20, { areaCode: 'D' }),
    { ...present(0, { areaCode: 'E' }), state: 'suppressed' } as unknown as Observation,
  ];

  it('ranks highest value first, ties share a rank, absent values are not ranked', () => {
    const ranked = rankByValue(observations);
    expect(ranked.map((r) => [r.observation.areaCode, r.rank])).toEqual([
      ['B', 1], ['C', 2], ['D', 2], ['A', 4],
    ]);
  });

  it('keeps the neighbourhood window full at the ends of the distribution', () => {
    const many = Array.from({ length: 30 }, (_, i) => present(i, { areaCode: `X${i}` }));
    const ranked = rankByValue(many);
    expect(rankWindow(ranked, 'X29', 5)?.length).toBe(11);
    expect(rankWindow(ranked, 'X29', 5)?.[0].observation.areaCode).toBe('X29');
    expect(rankWindow(ranked, 'X15', 5)?.map((r) => r.rank)).toEqual(
      [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    );
    expect(rankWindow(ranked, 'missing', 5)).toBeNull();
    expect(rankExtremes(ranked, 7)).toHaveLength(14);
  });
});

describe('one selection order everywhere', () => {
  it('puts the selected area first and never repeats it', () => {
    expect(selectionOrder('B', ['A', 'B', 'C'])).toEqual(['B', 'A', 'C']);
    expect(selectionOrder(null, ['A', 'C'])).toEqual(['A', 'C']);
  });
});

function line(label: string, values: (number | null)[], periods: string[]): TimeSeriesLine {
  return {
    label, colour: '#a9791f', showInterval: true,
    points: periods.map((period, index) => {
      const value = values[index];
      return {
        period,
        observation: value === null
          ? ({
              areaCode: 'E', period, sex: 'Persons', age: 'All ages', categoryType: null,
              category: null, state: 'missing', significance: 'not-compared',
              trend: 'not-available', note: null,
            } as Observation)
          : present(value, { period, lowerCi95: value - 0.4, upperCi95: value + 0.4 }),
      };
    }),
  };
}

describe('time-series layout', () => {
  const periods = Array.from({ length: 21 }, (_, i) => `${2001 + i} - ${String(3 + i).padStart(2, '0')}`);

  it('draws no rotated text and labels lines directly instead of with a legend', () => {
    const svg = renderTimeSeriesSvg({
      series: [line('Sheffield', periods.map((_, i) => 80 + i * 0.1), periods)],
      periods, indicator: lifeExpectancy, title: 'T', subtitle: 'S', notes: null,
      pooledYears: 3, width: 420, height: 200, standalone: false,
    });
    expect(svg).not.toMatch(/rotate\(/);
    expect(svg).toMatch(/<tspan font-weight="600"[^>]*>Sheffield<\/tspan>/);
  });

  it('marks a fitted axis as broken for life expectancy, and not for a rate', () => {
    const fitted = renderTimeSeriesSvg({
      series: [line('Sheffield', periods.map(() => 82), periods)],
      periods, indicator: lifeExpectancy, title: 'T', subtitle: 'S', notes: null,
      pooledYears: 3, width: 600, standalone: false,
    });
    expect(fitted).toMatch(/axis starts at \d+(\.\d+)?, not zero/);

    const zero = renderTimeSeriesSvg({
      series: [line('Sheffield', periods.map(() => 450), periods)],
      periods, indicator: admissions, title: 'T', subtitle: 'S', notes: null,
      pooledYears: 1, width: 600, standalone: false,
    });
    expect(zero).not.toMatch(/axis starts at/);
  });

  it('breaks the line at a missing period instead of joining across it', () => {
    const short = ['2019', '2020', '2021', '2022', '2023'];
    const svg = renderTimeSeriesSvg({
      series: [line('Area', [1, 2, null, 4, 5], short)],
      periods: short, indicator: admissions, title: 'T', subtitle: 'S', notes: null,
      pooledYears: 1, width: 600, standalone: false,
    });
    const linePaths = svg.match(/<path d="M [\d.,]+ L [\d.,]+" fill="none"/g) ?? [];
    expect(linePaths.length).toBe(2);
  });
});

describe('ranked dot-and-interval chart', () => {
  it('encodes the publisher flag by fill and makes rows clickable', () => {
    const svg = renderDotWhiskerSvg({
      rows: [
        { areaCode: 'A', areaName: 'Area A', observation: present(10, { areaCode: 'A', significance: 'worse', lowerCi95: 9, upperCi95: 11 }), isSelected: true, selectionIndex: 0, rank: 1 },
        { areaCode: 'B', areaName: 'Area B', observation: present(8, { areaCode: 'B', significance: 'similar', lowerCi95: 7, upperCi95: 9 }), isSelected: false, selectionIndex: null, rank: 2, gapBefore: true },
      ],
      indicator: admissions, benchmark: present(8.5), benchmarkLabel: 'England',
      title: 'T', subtitle: 'S', notes: null, standalone: false,
      encodeSignificance: true, rankTotal: 151, interactive: true,
    });
    expect(svg).toMatch(/data-area-code="A"/);
    expect(svg).toMatch(/Different from England/);
    expect(svg).toMatch(/Similar to England/);
    expect(svg).toMatch(/fill="#ffffff" stroke="#3f3c39"|fill="#ffffff" stroke="#002147"/);
    expect(svg).toMatch(/Rank of 151/);
  });
});

describe('trend lines respect the published sex category', () => {
  it('never mixes female and male values in one line', () => {
    const rows: Observation[] = [
      present(78.5, { areaCode: 'A', period: '2023', sex: 'Male' }),
      present(81.9, { areaCode: 'A', period: '2023', sex: 'Female' }),
      present(79.2, { areaCode: 'A', period: '2024', sex: 'Male' }),
      present(82.4, { areaCode: 'A', period: '2024', sex: 'Female' }),
    ];
    const index = new Map<string, Map<string, Map<string, Observation>>>();
    for (const o of rows) {
      const areas = index.get(o.sex) ?? new Map();
      index.set(o.sex, areas);
      const periods = areas.get(o.areaCode) ?? new Map();
      areas.set(o.areaCode, periods);
      periods.set(o.period, o);
    }
    const set = {
      age: 'All ages', bySexAreaPeriod: index, benchmarkBySexPeriod: new Map(),
    } as unknown as ObservationSet;

    const [male] = buildTrendLines({
      observations: set, sex: 'Male', periods: ['2023', '2024'],
      areas: [{ code: 'A', label: 'A', colour: '#000', showInterval: false }], benchmark: null,
    });
    expect(male.points.map((p) => (p.observation.state === 'present' ? p.observation.value : null)))
      .toEqual([78.5, 79.2]);
  });
});
