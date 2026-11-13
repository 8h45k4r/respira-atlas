import type { ObservationSet } from '@/data/loader';
import { seriesFor, benchmarkSeriesFor } from '@/data/loader';
import type { Observation } from '@/data/schemas/observation';
import type { TimeSeriesLine } from '@/export/chart-svg';
import { CHART_INK } from './palette';

export interface TrendArea {
  readonly code: string;
  readonly label: string;
  readonly colour: string;
  readonly showInterval: boolean;
}

function placeholder(areaCode: string, period: string, sex: string, age: string): Observation {
  return {
    areaCode, period, sex, age,
    categoryType: null, category: null, state: 'missing',
    significance: 'not-compared', trend: 'not-available', note: null,
  };
}

/**
 * Builds trend lines for one published sex category.
 *
 * Every line — areas and benchmark alike — is read for the same `sex`, so a
 * measure published only by sex can never have its two populations joined into
 * one line. A period with no row becomes an explicit `missing` observation,
 * which the renderer draws as a gap.
 */
export function buildTrendLines({
  observations, sex, periods, areas, benchmark,
}: {
  observations: ObservationSet;
  sex: string;
  periods: readonly string[];
  areas: readonly TrendArea[];
  benchmark: { label: string; areaCode: string; showInterval: boolean } | null;
}): TimeSeriesLine[] {
  const lines: TimeSeriesLine[] = areas.map((area) => {
    const byPeriod = seriesFor(observations, area.code, sex);
    return {
      label: area.label,
      colour: area.colour,
      showInterval: area.showInterval,
      points: periods.map((period) => ({
        period,
        observation: byPeriod.get(period) ?? placeholder(area.code, period, sex, observations.age),
      })),
    };
  });

  if (benchmark) {
    const byPeriod = benchmarkSeriesFor(observations, sex);
    lines.push({
      label: benchmark.label,
      colour: CHART_INK.benchmark,
      dashed: true,
      showInterval: benchmark.showInterval,
      points: periods.map((period) => ({
        period,
        observation:
          byPeriod.get(period) ?? placeholder(benchmark.areaCode, period, sex, observations.age),
      })),
    });
  }
  return lines;
}
