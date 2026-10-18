import { describe, it, expect } from 'vitest';
import { buildEvidenceStatement, statementIsExportable, type EvidenceContext } from '@/data/selectors/evidence';
import { makeIndicator, present, nonPresent } from './fixtures';

function context(overrides: Partial<EvidenceContext> = {}): EvidenceContext {
  return {
    indicator: makeIndicator(),
    areaCode: 'E54000008',
    areaName: 'NHS Birmingham and Solihull Integrated Care Board',
    areaTypeLabel: 'Integrated care boards',
    nation: 'England',
    period: '2024/25',
    periodLabel: '2024/25',
    periodIsPooled: false,
    pooledYears: 1,
    observation: present(420, { lowerCi95: 400, upperCi95: 441, count: 2100 }),
    benchmarkObservation: present(380),
    benchmarkLabel: 'England',
    sex: 'Persons',
    age: 'All ages',
    ...overrides,
  };
}

describe('evidence statement eligibility', () => {
  it('states what was observed with unit, period and measure type', () => {
    const statement = buildEvidenceStatement(context());
    expect(statement.observed).toMatch(/420/);
    expect(statement.observed).toMatch(/per 100,000/);
    expect(statement.observed).toMatch(/2024\/25/);
    expect(statement.observed).toMatch(/age-standardised/i);
    expect(statement.unavailable).toBeNull();
    expect(statementIsExportable(statement)).toBe(true);
  });

  it('compares with the benchmark and labels relative difference as relative', () => {
    const statement = buildEvidenceStatement(context());
    expect(statement.comparison).toMatch(/England/);
    expect(statement.comparison).toMatch(/relative difference/i);
  });

  it('quotes the confidence interval and whether it covers the benchmark', () => {
    const statement = buildEvidenceStatement(context());
    expect(statement.uncertainty).toMatch(/95% confidence interval/);
    expect(statement.uncertainty).toMatch(/400/);
    expect(statement.uncertainty).toMatch(/not as a formal hypothesis test/i);
  });

  it('says so plainly when no interval is published', () => {
    const statement = buildEvidenceStatement(
      context({ observation: present(420) }),
    );
    expect(statement.uncertainty).toMatch(/no confidence interval is published/i);
  });

  it('emits no comparison when the benchmark has no value', () => {
    const statement = buildEvidenceStatement(
      context({ benchmarkObservation: nonPresent('missing') }),
    );
    expect(statement.comparisonDetail).toBeNull();
    expect(statement.comparison).toMatch(/no England value is published/i);
  });

  it('never describes a two-point change as a trend', () => {
    const statement = buildEvidenceStatement(
      context({
        previousObservation: present(380, { lowerCi95: 360, upperCi95: 400 }),
        previousPeriod: '2023/24',
      }),
    );
    expect(statement.comparison).toMatch(/not an established trend/i);
  });

  it('omits any trend clause without a valid earlier observation', () => {
    const statement = buildEvidenceStatement(context({ previousPeriod: '2023/24' }));
    expect(statement.comparison).not.toMatch(/Compared with 2023\/24/);
  });

  it('flags pooled periods as non-independent', () => {
    const statement = buildEvidenceStatement(
      context({ periodIsPooled: true, pooledYears: 3, periodLabel: '2023 - 25' }),
    );
    expect(statement.uncertainty).toMatch(/overlap/i);
    expect(statement.uncertainty).toMatch(/not independent/i);
    expect(statement.limitations.join(' ')).toMatch(/pooled/i);
  });

  it('warns on small counts', () => {
    const statement = buildEvidenceStatement(
      context({ observation: present(12, { count: 7, lowerCi95: 5, upperCi95: 24 }) }),
    );
    expect(statement.uncertainty).toMatch(/count is small/i);
  });
});

describe('recorded prevalence guard', () => {
  const qof = makeIndicator({
    id: 253,
    shortName: 'COPD recorded prevalence',
    direction: 'not-interpretable',
    unit: '%',
    valueType: 'Proportion',
  });

  it('refuses to repeat a better/worse flag for recorded prevalence', () => {
    const statement = buildEvidenceStatement(
      context({
        indicator: qof,
        observation: present(2.4, { significance: 'worse', lowerCi95: 2.2, upperCi95: 2.6 }),
        benchmarkObservation: present(1.9),
      }),
    );
    expect(statement.comparison).toMatch(/not repeated here/i);
    expect(statement.comparison).toMatch(/case-finding/i);
  });

  it('states that recorded prevalence is not true prevalence', () => {
    const statement = buildEvidenceStatement(
      context({ indicator: qof, observation: present(2.4), benchmarkObservation: present(1.9) }),
    );
    expect(statement.limitations.join(' ')).toMatch(/not a measure of true underlying prevalence/i);
  });

  it('uses percentage points for a percentage measure', () => {
    const statement = buildEvidenceStatement(
      context({ indicator: qof, observation: present(2.4), benchmarkObservation: present(1.9) }),
    );
    expect(statement.comparison).toMatch(/percentage points/);
  });
});

describe('unavailability is explained, never implied', () => {
  it('distinguishes suppression from a low value', () => {
    const statement = buildEvidenceStatement(
      context({ observation: nonPresent('suppressed', { note: 'Small numbers' }) }),
    );
    expect(statement.unavailable!.state).toBe('suppressed');
    expect(statement.observed).toMatch(/does not mean the value is zero or low/i);
    expect(statementIsExportable(statement)).toBe(false);
  });

  it('distinguishes missing from zero', () => {
    const statement = buildEvidenceStatement(
      context({ observation: nonPresent('missing') }),
    );
    expect(statement.observed).toMatch(/missing data, not a zero/i);
  });

  it('explains an out-of-coverage nation as a coverage gap', () => {
    const statement = buildEvidenceStatement(
      context({ observation: undefined, nation: 'Scotland', areaName: 'Fife' }),
    );
    expect(statement.observed).toMatch(/England-only dataset/i);
    expect(statement.observed).toMatch(/gap in coverage, not a low value/i);
  });
});

describe('every statement carries provenance and causal limits', () => {
  it('records the full provenance block', () => {
    const { provenance } = buildEvidenceStatement(context(), 'July 2022');
    expect(provenance.indicatorId).toBe(93577);
    expect(provenance.unit).toBe('per 100,000');
    expect(provenance.measureType).toMatch(/age-standardised/i);
    expect(provenance.benchmark).toBe('England');
    expect(provenance.licence).toMatch(/Open Government Licence/);
    expect(provenance.boundaryVintage).toBe('July 2022');
    expect(provenance.retrievedAt).toBeTruthy();
  });

  it('always states that the observation is not causal', () => {
    const statement = buildEvidenceStatement(context());
    expect(statement.limitations.join(' ')).toMatch(/no causal claim/i);
    expect(statement.limitations.join(' ')).toMatch(/do not transfer to individuals/i);
  });

  it('always offers further questions', () => {
    expect(buildEvidenceStatement(context()).furtherEvidence.length).toBeGreaterThan(2);
  });
});
