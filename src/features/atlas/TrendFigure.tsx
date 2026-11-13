import { useCallback, useMemo } from 'react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import type { ObservationSet } from '@/data/loader';
import type { AreaRegistry } from '@/geography/model';
import type { ResolvedSelection, Analysis } from './useAnalysis';
import { renderTimeSeriesSvg, type TimeSeriesLine } from '@/export/chart-svg';
import { InlineSvgChart } from '@/charts/InlineSvgChart';
import { FigureFrame } from '@/components/common/FigureFrame';
import { UnsupportedState } from '@/components/common/states';
import { selectionColour, selectionOrder } from '@/charts/palette';
import { buildTrendLines } from '@/charts/trend-lines';
import { downloadSvg } from '@/export/download';
import { slug } from '@/lib/utils';

/**
 * Trend over the selected period series.
 *
 * Only one series is ever plotted, because pooled and single-year periods are
 * separate series and plotting them together would show overlapping multi-year
 * estimates as if they were annual observations.
 */
export function TrendFigure({
  catalogue, selection, observations, analysis, state, registry,
}: {
  catalogue: Catalogue;
  selection: ResolvedSelection;
  observations: ObservationSet;
  analysis: Analysis;
  state: AtlasState;
  registry: AreaRegistry;
}) {
  const { indicator } = selection;
  const series = analysis.periodSeries;
  const codes = selectionOrder(state.selectedAreaCode, state.comparisonAreaCodes);

  // The selected area and England carry their interval bands; further compared
  // areas are drawn as lines only, so up to five series stay legible.
  const codesKey = codes.join(',');
  const hasBenchmark = Boolean(analysis.benchmarkObservation);
  const { benchmark } = catalogue.manifest.coverage;
  const lines: TimeSeriesLine[] = useMemo(() => buildTrendLines({
    observations,
    sex: analysis.sex,
    periods: series.periods,
    areas: codes.map((code, index) => ({
      code,
      label: registry.get(code)?.name ?? code,
      colour: selectionColour(index),
      showInterval: index === 0,
    })),
    benchmark: hasBenchmark
      ? { label: benchmark.label, areaCode: benchmark.areaCode, showInterval: true }
      : null,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [observations, analysis.sex, series.periods, codesKey, registry, hasBenchmark, benchmark]);

  const title = state.selectedAreaCode
    ? `How has ${indicator.shortName.toLowerCase()} changed in ${
        registry.get(state.selectedAreaCode)?.name ?? 'the selected area'
      }?`
    : `How has ${indicator.shortName.toLowerCase()} changed in England?`;

  const subtitle =
    `${series.label} series, ${series.periodCount} periods. ` +
    `${selection.areaType.label}. ${indicator.unit ?? ''}`;

  const render = useCallback(
    (width: number) =>
      renderTimeSeriesSvg({
        series: lines, periods: series.periods, indicator, title, subtitle,
        notes: null, pooledYears: series.years,
        width, height: 230, standalone: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, series, indicator, title, subtitle],
  );

  if (series.periods.length < 2) {
    return (
      <FigureFrame
        question={title}
        meta={{
          population: analysis.notes.population, period: analysis.notes.period,
          geography: selection.areaType.label, unit: indicator.unit ?? '',
          source: indicator.dataSource ?? '',
        }}
        limitation="A single period cannot show change over time."
      >
        <UnsupportedState
          title="Only one period is published"
          explanation={
            <>
              This indicator has {series.periods.length} period
              {series.periods.length === 1 ? '' : 's'} at {selection.areaType.label.toLowerCase()},
              so no time series can be drawn. Nothing is interpolated to fill the gap.
            </>
          }
        />
      </FigureFrame>
    );
  }

  return (
    <FigureFrame
      question={title}
      indicatorName={indicator.name}
      meta={{
        population: analysis.notes.population,
        period: `${series.periods[0]} to ${series.periods[series.periods.length - 1]}`,
        geography: selection.areaType.label,
        boundaryVintage: selection.areaType.boundaryVintage,
        unit: indicator.unit ?? 'not stated',
        source: indicator.dataSource ?? 'Not stated',
      }}
      caveats={[
        ...(series.pooled
          ? [{ kind: 'pooled' as const, label: `${series.years}-year periods overlap` }]
          : [{ kind: 'test' as const, label: 'Two points ≠ a trend' }]),
        { kind: 'gaps', label: 'Gap = no value, not zero' },
        { kind: 'interval', label: 'Band = 95% interval' },
      ]}
      limitation={
        series.pooled
          ? `Points are rolling ${series.years}-year pooled estimates. Consecutive points share ` +
            'years of data, so they are not independent and the line overstates how smooth the ' +
            'underlying change is.'
          : 'A line between two points shows a difference, not an established trend. Breaks in the ' +
            'line are periods with no published value, not zeros.'
      }
      onExport={() =>
        downloadSvg(
          renderTimeSeriesSvg({
            series: lines, periods: series.periods, indicator, title, subtitle,
            notes: analysis.notes,
            pooledYears: series.years, width: 900, height: 320,
          }),
          `${slug(indicator.shortName)}-trend-${slug(selection.areaType.key)}`,
        )
      }
      exportLabel="Export SVG"
      accessibleDescription={
        `${title} ${subtitle}. ` +
        lines
          .map((line) => {
            const points = line.points.filter((point) => point.observation.state === 'present');
            if (points.length === 0) return `${line.label}: no values published.`;
            const first = points[0];
            const last = points[points.length - 1];
            const firstValue = first.observation.state === 'present' ? first.observation.value : 0;
            const lastValue = last.observation.state === 'present' ? last.observation.value : 0;
            return (
              `${line.label}: ${firstValue} in ${first.period} to ${lastValue} in ${last.period}, ` +
              `${points.length} periods with a value.`
            );
          })
          .join(' ')
      }
    >
      <InlineSvgChart
        render={render}
        ariaLabel={`${title} ${subtitle}`}
        className="[&_svg]:h-auto [&_svg]:w-full"
        minWidth={380}
      />
    </FigureFrame>
  );
}
