import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { inferFlagLevel } from '@/data/selectors/flag-level';
import { compareToBenchmark } from '@/data/selectors/comparison';
import { buildEvidenceStatement, type EvidenceContext } from '@/data/selectors/evidence';
import { decodeObservations } from '@/data/validation/decode';
import { renderDotWhiskerSvg } from '@/export/chart-svg';
import type { Observation } from '@/data/schemas/observation';
import { makeIndicator, present } from './fixtures';

const england = present(10, { areaCode: 'E92000001' });

/** A row whose 95% interval misses England but whose 99.8% interval contains it. */
const between = (significance: Observation['significance']) =>
  present(12, {
    areaCode: 'A', significance,
    lowerCi95: 11, upperCi95: 13, lowerCi998: 9.5, upperCi998: 14.5,
  });

describe('inferring the level behind the publisher flag', () => {
  it('reads 99.8% when only that level agrees with every flag', () => {
    const level = inferFlagLevel([between('similar')], [england]);
    expect(level).toMatchObject({ level: 99.8, basis: 'exact', compared: 1 });
  });

  it('reads 95% when that level agrees, and prefers it when both agree', () => {
    expect(inferFlagLevel([between('worse')], [england]).level).toBe(95);
    const both = present(20, {
      significance: 'worse', lowerCi95: 18, upperCi95: 22, lowerCi998: 17, upperCi998: 23,
    });
    expect(inferFlagLevel([both], [england])).toMatchObject({ level: 95, basis: 'exact' });
  });

  it('admits when no level fits every row', () => {
    const conflicting = [
      between('similar'),
      present(12, { areaCode: 'B', significance: 'worse', lowerCi95: 9, upperCi95: 15, lowerCi998: 8, upperCi998: 16 }),
    ];
    expect(inferFlagLevel(conflicting, [england]).basis).toBe('approximate');
  });

  it('ignores rows without a flag, an interval or a benchmark', () => {
    expect(inferFlagLevel([present(12, { significance: 'not-compared', lowerCi95: 1, upperCi95: 2 })], [england]))
      .toMatchObject({ level: null, basis: 'none' });
    expect(inferFlagLevel([present(12, { significance: 'worse' })], [england]).basis).toBe('none');
  });

  it('matches the committed data: 99.8% for three GP-register measures, 95% elsewhere', () => {
    const dir = 'public/data/observations';
    const levels = new Map<string, number | null>();
    for (const file of readdirSync(dir).filter((f) => !f.includes('subgroups'))) {
      const raw = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
      const result = inferFlagLevel(
        decodeObservations(raw.data), decodeObservations(raw.benchmark.data),
      );
      if (result.basis === 'none') continue;
      expect(result.basis, file).toBe('exact');
      levels.set(file, result.level);
    }
    for (const id of ['219', '848', '90933']) {
      expect(levels.get(`${id}-ctyua23.json`), id).toBe(99.8);
      expect(levels.get(`${id}-icb22.json`), id).toBe(99.8);
    }
    expect(levels.get('253-ctyua23.json')).toBe(95);
    expect(levels.get('93963-ctyua23.json')).toBe(95);
  });
});

describe('statements and figures follow the flag level', () => {
  const indicator = makeIndicator({ unit: '%', valueType: 'Proportion', direction: 'not-interpretable' });

  it('reports the interval at the flag level beside the 95% check', () => {
    const result = compareToBenchmark(between('similar'), england, 'England', indicator, 99.8)!;
    expect(result.intervalContainsBenchmark).toBe(false);
    expect(result.flagInterval).toMatchObject({ level: 99.8, containsBenchmark: true });
    expect(compareToBenchmark(between('similar'), england, 'England', indicator)!.flagInterval).toBeNull();
  });

  const context = (overrides: Partial<EvidenceContext> = {}): EvidenceContext => ({
    indicator, areaCode: 'A', areaName: 'Area A', areaTypeLabel: 'Areas', nation: 'England',
    period: '2024/25', periodLabel: '2024/25', periodIsPooled: false, pooledYears: 1,
    observation: between('similar'), benchmarkObservation: england, benchmarkLabel: 'England',
    sex: 'Persons', age: 'All ages',
    flagLevel: { level: 99.8, basis: 'exact', compared: 100, agreement: 1 },
    ...overrides,
  });

  it('never sets a 95% interval that misses England against a "similar" flag', () => {
    const statement = buildEvidenceStatement(context());
    expect(statement.uncertainty).toMatch(/99\.8% interval/);
    expect(statement.uncertainty).toMatch(/flagged similar even though its 95% interval misses England/);
    expect(statement.uncertainty).not.toMatch(/formal hypothesis test/);
    expect(statement.comparison).toMatch(/at the 99\.8% level/);
  });

  it('names the shared check when the flag follows the 95% interval', () => {
    const statement = buildEvidenceStatement(context({
      observation: between('higher'),
      flagLevel: { level: 95, basis: 'exact', compared: 100, agreement: 1 },
    }));
    expect(statement.uncertainty).toMatch(/same check the publisher's flag uses/);
  });

  it('falls back to a description when the level is not exact', () => {
    const statement = buildEvidenceStatement(context({
      flagLevel: { level: 99.8, basis: 'approximate', compared: 100, agreement: 0.9 },
    }));
    expect(statement.uncertainty).toMatch(/not as a formal hypothesis test/);
    expect(statement.uncertainty).toMatch(/does not follow either published interval exactly/);
  });

  it('draws ranking whiskers at the requested level', () => {
    const row = {
      areaCode: 'A', areaName: 'Area A', observation: between('similar'),
      isSelected: false, selectionIndex: null,
    };
    const common = {
      rows: [row], indicator, benchmark: england, benchmarkLabel: 'England',
      title: 'T', subtitle: 'S', notes: null, standalone: false as const,
      encodeSignificance: true, width: 600,
    };
    const at95 = renderDotWhiskerSvg(common);
    const at998 = renderDotWhiskerSvg({ ...common, intervalLevel: 99.8 });
    expect(at998).toMatch(/99\.8% confidence interval, the level the publisher’s flag uses/);
    expect(at95).toMatch(/95% confidence interval/);
    // A row published with 95% limits only has no 99.8% whisker to draw.
    const only95 = { ...row, observation: present(12, { areaCode: 'A', lowerCi95: 11, upperCi95: 13 }) };
    expect(renderDotWhiskerSvg({ ...common, rows: [only95] })).not.toMatch(/\(no interval\)/);
    expect(renderDotWhiskerSvg({ ...common, rows: [only95], intervalLevel: 99.8 })).toMatch(/\(no interval\)/);
  });
});
