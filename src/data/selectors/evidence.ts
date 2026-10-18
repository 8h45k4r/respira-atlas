import type { Indicator } from '../schemas/manifest';
import type { Observation, PresentObservation } from '../schemas/observation';
import { isPresent, hasInterval } from '../schemas/observation';
import {
  formatWithUnit, formatValue, formatInterval, measureTypeLabel,
  isPercentageMeasure, isAgeStandardised,
} from './format';
import { compareToBenchmark, allowsQualitativeReading, type BenchmarkComparison } from './comparison';

/**
 * Evidence statements are generated from deterministic templates and validated
 * calculations. No language model is involved, at build time or at runtime.
 *
 * The four-part structure is fixed: what was observed, how it compares, what
 * uncertainty remains, what further evidence would help. A clause is emitted
 * only when its specific eligibility test passes, so the statement gets shorter
 * when the data are weaker rather than more confident.
 */

export interface EvidenceContext {
  readonly indicator: Indicator;
  readonly areaCode: string;
  readonly areaName: string;
  readonly areaTypeLabel: string;
  readonly nation: string;
  readonly period: string;
  readonly periodLabel: string;
  readonly periodIsPooled: boolean;
  readonly pooledYears: number;
  readonly observation: Observation | undefined;
  readonly benchmarkObservation: Observation | undefined;
  readonly benchmarkLabel: string;
  /** Earlier observation from the SAME period series, if the user selected one. */
  readonly previousObservation?: Observation | undefined;
  readonly previousPeriod?: string | undefined;
  readonly sex: string;
  readonly age: string;
}

export interface EvidenceStatement {
  /** What was observed. Always present when there is a value. */
  readonly observed: string;
  /** How it compares with the benchmark. Null when no valid comparison exists. */
  readonly comparison: string | null;
  /** What uncertainty remains. */
  readonly uncertainty: string;
  /** What further evidence would help. */
  readonly furtherEvidence: readonly string[];
  /** Hard limitations that must travel with the figure. */
  readonly limitations: readonly string[];
  readonly provenance: EvidenceProvenance;
  /** Set when no value exists; the other fields then describe the absence. */
  readonly unavailable: {
    readonly state: Observation['state'] | 'no-observation';
    readonly explanation: string;
  } | null;
  readonly comparisonDetail: BenchmarkComparison | null;
}

export interface EvidenceProvenance {
  readonly indicatorId: number;
  readonly indicatorName: string;
  readonly population: string;
  readonly period: string;
  readonly geography: string;
  readonly unit: string;
  readonly measureType: string;
  readonly benchmark: string;
  readonly source: string;
  readonly publisher: string;
  readonly licence: string;
  readonly retrievedAt: string;
  readonly boundaryVintage: string | null;
}

function populationLabel(context: EvidenceContext): string {
  const parts: string[] = [];
  if (context.sex && context.sex !== 'Persons') parts.push(context.sex.toLowerCase());
  if (context.age && context.age !== 'All ages') parts.push(context.age.toLowerCase());
  if (parts.length === 0) return 'all persons, all ages';
  return parts.join(', ');
}

function explainUnavailable(context: EvidenceContext): string {
  const { observation, areaName, indicator, period } = context;
  if (!observation) {
    if (context.nation !== 'England') {
      return (
        `${areaName} is in ${context.nation}. This indicator comes from an England-only ` +
        'dataset, so no value exists for it — this is a gap in coverage, not a low value.'
      );
    }
    return `No observation is published for ${areaName} for ${period}.`;
  }
  switch (observation.state) {
    case 'suppressed':
      return (
        `The value for ${areaName} is suppressed by the publisher${
          observation.note ? ` (${observation.note})` : ''
        }. Suppression usually protects small numbers; it does not mean the value is zero or low.`
      );
    case 'missing':
      return (
        `No value is published for ${areaName} for ${period}${
          observation.note ? ` (${observation.note})` : ''
        }. This is missing data, not a zero.`
      );
    case 'not-applicable':
      return `${indicator.shortName} does not apply to ${areaName}.`;
    default:
      return `No value available for ${areaName}.`;
  }
}

/** Emitted only for percentage measures, where a point difference is meaningful. */
function comparisonClause(
  comparison: BenchmarkComparison,
  context: EvidenceContext,
): string {
  const { indicator } = context;
  const { benchmark, benchmarkLabel, absoluteDifference, direction } = comparison;

  if (direction === 'equal') {
    return `This is the same as the ${benchmarkLabel} figure of ${formatWithUnit(benchmark.value, indicator)}.`;
  }

  const magnitude = Math.abs(absoluteDifference);
  let differencePhrase: string;
  if (isPercentageMeasure(indicator)) {
    differencePhrase = `${formatValue(magnitude, indicator)} percentage points ${direction}`;
  } else {
    differencePhrase = `${formatWithUnit(magnitude, indicator)} ${direction}`;
  }

  let clause =
    `That is ${differencePhrase} than ${benchmarkLabel} ` +
    `(${formatWithUnit(benchmark.value, indicator)}) for the same period`;

  // A relative difference is only quoted when the denominator is a real,
  // non-zero benchmark value, and it is always labelled as relative.
  if (
    comparison.relativeDifferencePercent !== null &&
    Number.isFinite(comparison.relativeDifferencePercent) &&
    Math.abs(comparison.relativeDifferencePercent) >= 0.5
  ) {
    const relative = Math.abs(comparison.relativeDifferencePercent);
    clause += `, a relative difference of ${relative.toFixed(relative >= 10 ? 0 : 1)}%`;
  }
  return `${clause}.`;
}

function significanceClause(
  comparison: BenchmarkComparison,
  context: EvidenceContext,
): string | null {
  const { indicator } = context;
  const flag = comparison.sourceSignificance;
  if (flag === 'not-compared') return null;

  // 'better'/'worse' are only repeated when the measure supports that reading.
  if ((flag === 'better' || flag === 'worse') && !allowsQualitativeReading(indicator)) {
    return (
      `The publisher flags this area as ${flag} than ${comparison.benchmarkLabel}, but ` +
      `${indicator.shortName} is a recorded-prevalence measure: a higher figure may reflect ` +
      'more complete case-finding rather than more disease, so that reading is not repeated here.'
    );
  }

  const descriptor =
    flag === 'better' ? `statistically significantly better than ${comparison.benchmarkLabel}`
    : flag === 'worse' ? `statistically significantly worse than ${comparison.benchmarkLabel}`
    : flag === 'similar' ? `not statistically significantly different from ${comparison.benchmarkLabel}`
    : flag === 'higher' ? `higher than ${comparison.benchmarkLabel}`
    : `lower than ${comparison.benchmarkLabel}`;

  return `The publisher's own significance flag records this area as ${descriptor}.`;
}

function uncertaintyClause(
  observation: PresentObservation,
  context: EvidenceContext,
  comparison: BenchmarkComparison | null,
): string {
  const { indicator } = context;
  const sentences: string[] = [];

  if (hasInterval(observation)) {
    sentences.push(
      `The 95% confidence interval runs from ` +
        `${formatInterval(observation.lowerCi95, observation.upperCi95, indicator)} ` +
        `${indicator.unit === '%' ? 'per cent' : indicator.unit ?? ''}`.trimEnd() + '.',
    );
    if (comparison && comparison.intervalContainsBenchmark !== null) {
      sentences.push(
        comparison.intervalContainsBenchmark
          ? `That interval includes the ${comparison.benchmarkLabel} value, so the data are ` +
            'consistent with no real difference from the benchmark.'
          : `That interval does not include the ${comparison.benchmarkLabel} value. Treat this ` +
            'as a description of the interval, not as a formal hypothesis test.',
      );
    }
  } else {
    sentences.push(
      'No confidence interval is published for this observation, so the precision of the ' +
        'estimate cannot be assessed from these data.',
    );
  }

  if (context.periodIsPooled) {
    sentences.push(
      `The period is a ${context.pooledYears}-year pooled estimate. Consecutive periods ` +
        'overlap, so successive values are not independent observations.',
    );
  }

  if (observation.count !== null && observation.count < 20 && indicator.countIsMeaningful) {
    sentences.push(
      `The underlying count is small (${formatValue(observation.count, indicator)}), so the ` +
        'estimate is unstable and small changes should not be over-read.',
    );
  }

  return sentences.join(' ');
}

function furtherEvidenceFor(context: EvidenceContext): string[] {
  const { indicator } = context;
  const questions: string[] = [];

  questions.push(
    `Does the pattern hold across the other periods in this series, or is ${context.periodLabel} unusual?`,
  );

  if (isAgeStandardised(indicator)) {
    questions.push(
      'Age-standardisation removes age structure but not other population differences. ' +
        'What is the deprivation and ethnic profile of this population?',
    );
  } else {
    questions.push(
      `This is a ${measureTypeLabel(indicator).toLowerCase()}, so differences in age structure ` +
        'between areas are not adjusted for. Would an age-standardised measure change the picture?',
    );
  }

  if (indicator.domain === 'copd' || indicator.domain === 'asthma') {
    questions.push(
      'How do diagnosis and coding practices vary between the services serving these areas? ' +
        'Recorded prevalence depends on ascertainment as well as on underlying disease.',
    );
  }
  if (indicator.domain === 'environment') {
    questions.push(
      'Area-level exposure does not establish individual exposure. What individual-level ' +
        'exposure data exist for this population?',
    );
  }
  if (indicator.domain === 'mortality' || indicator.domain === 'respiratory') {
    questions.push(
      'Are admission and mortality patterns consistent here, or do they diverge? Divergence ' +
        'can point to differences in access or in case mix rather than in incidence.',
    );
  }
  questions.push(
    'What service capacity, referral pattern and case mix lie behind this figure? A descriptive ' +
      'rate cannot distinguish need from provision.',
  );
  return questions;
}

function limitationsFor(context: EvidenceContext): string[] {
  const { indicator } = context;
  const limitations: string[] = [];

  limitations.push(
    'This is a descriptive, area-level observation. It supports no causal claim about why the ' +
      'figure differs, and area-level associations do not transfer to individuals.',
  );

  if (indicator.direction === 'not-interpretable') {
    limitations.push(
      `${indicator.shortName} measures recorded prevalence. A higher figure may reflect better ` +
        'case-finding and coding rather than more underlying disease; a lower figure may reflect ' +
        'under-diagnosis. It is not a measure of true underlying prevalence.',
    );
  }
  if (context.periodIsPooled) {
    limitations.push(
      `Periods are rolling ${context.pooledYears}-year pooled estimates and overlap one another.`,
    );
  }
  if (indicator.dataQualityNote) {
    limitations.push(`Publisher data-quality note: ${indicator.dataQualityNote}`);
  }
  if (indicator.caveats) {
    limitations.push(`Publisher caveats: ${indicator.caveats}`);
  }
  if (indicator.disclosureControl) {
    limitations.push(`Disclosure control: ${indicator.disclosureControl}`);
  }
  if (context.nation !== 'England') {
    limitations.push(
      'This indicator covers England only. Figures for other UK nations are not available ' +
        'from this source and are not shown.',
    );
  }
  return limitations;
}

function provenanceFor(
  context: EvidenceContext,
  boundaryVintage: string | null,
): EvidenceProvenance {
  const { indicator } = context;
  return {
    indicatorId: indicator.id,
    indicatorName: indicator.name,
    population: populationLabel(context),
    period: context.periodLabel,
    geography: context.areaTypeLabel,
    unit: indicator.unit ?? 'not stated',
    measureType: measureTypeLabel(indicator),
    benchmark: context.benchmarkLabel,
    source: indicator.dataSource ?? 'Not stated',
    publisher: indicator.licence.publisher,
    licence: indicator.licence.name,
    retrievedAt: indicator.retrievedAt,
    boundaryVintage,
  };
}

/** Trend claims require a valid earlier period from the same series. */
export function trendClause(context: EvidenceContext): string | null {
  const current = context.observation;
  const previous = context.previousObservation;
  if (!isPresent(current) || !isPresent(previous) || !context.previousPeriod) return null;

  const change = current.value - previous.value;
  const { indicator } = context;
  const wording = change > 0 ? 'higher' : change < 0 ? 'lower' : 'unchanged';

  if (change === 0) {
    return `The value is unchanged from ${context.previousPeriod}.`;
  }

  // Deliberately framed as a change between two points, never as a trend.
  let clause =
    `Compared with ${context.previousPeriod}, the value is ` +
    `${formatWithUnit(Math.abs(change), indicator)} ${wording}. ` +
    'This is a difference between two periods, not an established trend.';

  // Where both intervals exist, say whether they overlap — as a description.
  if (hasInterval(current) && hasInterval(previous)) {
    const overlap =
      current.lowerCi95 <= previous.upperCi95 && previous.lowerCi95 <= current.upperCi95;
    clause += overlap
      ? ' The confidence intervals for the two periods overlap.'
      : ' The confidence intervals for the two periods do not overlap.';
  }

  if (current.trend !== 'not-available') {
    const label: Record<string, string> = {
      'no-significant-change': 'no significant change',
      increasing: 'increasing',
      'increasing-worse': 'increasing and getting worse',
      decreasing: 'decreasing',
      'decreasing-better': 'decreasing and getting better',
    };
    clause +=
      ` The publisher's own trend assessment for this area is "${label[current.trend]}", ` +
      'which is calculated over the full series rather than from these two points.';
  }
  return clause;
}

export function buildEvidenceStatement(
  context: EvidenceContext,
  boundaryVintage: string | null = null,
): EvidenceStatement {
  const { indicator, observation } = context;
  const provenance = provenanceFor(context, boundaryVintage);

  if (!isPresent(observation)) {
    return {
      observed: explainUnavailable(context),
      comparison: null,
      uncertainty:
        'No value is available, so no uncertainty can be quantified for this area and period.',
      furtherEvidence: [
        'Is the value available at a different geography or period for this area?',
        'Is a different but related indicator published for this area?',
      ],
      limitations: limitationsFor(context),
      provenance,
      unavailable: {
        state: observation?.state ?? 'no-observation',
        explanation: explainUnavailable(context),
      },
      comparisonDetail: null,
    };
  }

  const comparison = compareToBenchmark(
    observation, context.benchmarkObservation, context.benchmarkLabel, indicator,
  );

  const observed =
    `In ${context.areaName}, ${indicator.shortName.toLowerCase()} was ` +
    `${formatWithUnit(observation.value, indicator)} in ${context.periodLabel} ` +
    `(${measureTypeLabel(indicator).toLowerCase()}, ${populationLabel(context)}).`;

  const comparisonParts: string[] = [];
  if (comparison) {
    comparisonParts.push(comparisonClause(comparison, context));
    const significance = significanceClause(comparison, context);
    if (significance) comparisonParts.push(significance);
  } else if (context.benchmarkObservation && !isPresent(context.benchmarkObservation)) {
    comparisonParts.push(
      `No ${context.benchmarkLabel} value is published for ${context.periodLabel}, so no ` +
        'benchmark comparison is shown.',
    );
  }

  const trend = trendClause(context);
  if (trend) comparisonParts.push(trend);

  return {
    observed,
    comparison: comparisonParts.length > 0 ? comparisonParts.join(' ') : null,
    uncertainty: uncertaintyClause(observation, context, comparison),
    furtherEvidence: furtherEvidenceFor(context),
    limitations: limitationsFor(context),
    provenance,
    unavailable: null,
    comparisonDetail: comparison,
  };
}

/** Whether a statement may be exported as evidence at all. */
export function statementIsExportable(statement: EvidenceStatement): boolean {
  return statement.unavailable === null;
}
