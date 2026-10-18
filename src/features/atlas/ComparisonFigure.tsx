import { useCallback, useMemo } from 'react';
import type { AtlasState } from '@/state/atlas-state';
import type { ObservationSet } from '@/data/loader';
import type { AreaRegistry } from '@/geography/model';
import type { ResolvedSelection, Analysis } from './useAnalysis';
import { renderDotWhiskerSvg, type DotWhiskerRow } from '@/export/chart-svg';
import { InlineSvgChart } from '@/charts/InlineSvgChart';
import { FigureFrame } from '@/components/common/FigureFrame';
import { UnsupportedState } from '@/components/common/states';
import { isPresent } from '@/data/schemas/observation';
import { checkComparable, describeIncompatibility } from '@/data/selectors/comparison';
import { downloadSvg } from '@/export/download';
import { slug } from '@/lib/utils';

const MAX_RANKED_ROWS = 14;

/**
 * Dot-and-whisker comparison.
 *
 * Drawn only where the publisher supplies confidence intervals. Where areas are
 * being compared, every pair is checked for compatibility first — same
 * geography, boundary vintage, period, pooling and subgroup — and a blocked
 * comparison states why rather than drawing something invalid.
 */
export function ComparisonFigure({
  selection, observations, analysis, state, registry, onSelect,
}: {
  selection: ResolvedSelection;
  observations: ObservationSet;
  analysis: Analysis;
  state: AtlasState;
  registry: AreaRegistry;
  onSelect: (code: string) => void;
}) {
  const { indicator } = selection;
  const hasIntervals = selection.availability.hasConfidenceIntervals;

  const selectedCodes = useMemo(
    () => [
      ...(state.selectedAreaCode ? [state.selectedAreaCode] : []),
      ...state.comparisonAreaCodes.filter((code) => code !== state.selectedAreaCode),
    ],
    [state.selectedAreaCode, state.comparisonAreaCodes],
  );

  // Compatibility gate. All rows come from one observation file, one period and
  // one subgroup, so the contexts agree by construction — but the check is run
  // rather than assumed, so a future mixed-source comparison cannot slip past.
  const incompatibility = useMemo(() => {
    const context = {
      areaTypeKey: selection.areaType.key,
      boundaryVintage: selection.areaType.boundaryVintage,
      period: analysis.period,
      periodRange: analysis.periodSeries.range,
      sex: observations.sex,
      age: observations.age,
    };
    const result = checkComparable(context, context);
    return result.compatible ? null : result.reasons.map(describeIncompatibility);
  }, [selection, analysis.period, analysis.periodSeries.range, observations]);

  const rows: DotWhiskerRow[] = useMemo(() => {
    const byCode = new Map(
      analysis.observationsForPeriod.map((observation) => [observation.areaCode, observation]),
    );

    if (selectedCodes.length > 0) {
      return selectedCodes.flatMap((code, index) => {
        const observation = byCode.get(code);
        if (!observation) return [];
        return [{
          areaCode: code,
          areaName: registry.get(code)?.name ?? code,
          observation,
          isSelected: code === state.selectedAreaCode,
          selectionIndex: index,
        }];
      });
    }

    // With nothing selected, show the extremes of the distribution — labelled as
    // the distribution's ends, not as a performance table.
    const present = analysis.observationsForPeriod.filter(isPresent);
    const sorted = [...present].sort((a, b) => b.value - a.value);
    const half = Math.floor(MAX_RANKED_ROWS / 2);
    const picked = sorted.length <= MAX_RANKED_ROWS
      ? sorted
      : [...sorted.slice(0, half), ...sorted.slice(-half)];
    return picked.map((observation) => ({
      areaCode: observation.areaCode,
      areaName: registry.get(observation.areaCode)?.name ?? observation.areaCode,
      observation,
      isSelected: false,
      selectionIndex: null,
    }));
  }, [analysis.observationsForPeriod, selectedCodes, registry, state.selectedAreaCode]);

  const benchmark = isPresent(analysis.benchmarkObservation)
    ? analysis.benchmarkObservation
    : null;

  const title = selectedCodes.length > 0
    ? `How do the selected areas compare with England, and is the difference supported by the intervals?`
    : `Where does ${indicator.shortName.toLowerCase()} sit highest and lowest, and do the intervals overlap?`;

  const subtitle =
    `${rows.length} ${selection.areaType.label.toLowerCase()}, ${analysis.period}. ` +
    `${indicator.unit ?? ''}`;

  const render = useCallback(
    (width: number) =>
      renderDotWhiskerSvg({
        rows, indicator, benchmark,
        benchmarkLabel: 'England', title, subtitle, notes: null,
        width, standalone: false,
      }),
    [rows, indicator, benchmark, title, subtitle],
  );

  const limitation = hasIntervals
    ? 'Bars are the published 95% confidence intervals. Overlapping intervals are not a ' +
      'significance test and non-overlap is not proof of a difference. Ordering areas by ' +
      'value does not make a performance league table: neighbouring areas are usually not ' +
      'distinguishable from one another.'
    : 'No confidence intervals are published for this indicator at this geography, so the ' +
      'precision of each estimate is unknown.';

  if (incompatibility) {
    return (
      <FigureFrame
        question={title}
        meta={{
          population: analysis.notes.population, period: analysis.notes.period,
          geography: selection.areaType.label, unit: indicator.unit ?? '',
          source: indicator.dataSource ?? '',
        }}
        limitation="This comparison is blocked."
      >
        <UnsupportedState
          title="These areas cannot be compared"
          explanation={
            <ul className="list-outside list-disc space-y-1 pl-4">
              {incompatibility.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          }
        />
      </FigureFrame>
    );
  }

  if (rows.length === 0) {
    return (
      <FigureFrame
        question={title}
        meta={{
          population: analysis.notes.population, period: analysis.notes.period,
          geography: selection.areaType.label, unit: indicator.unit ?? '',
          source: indicator.dataSource ?? '',
        }}
        limitation="No comparable values are available for this selection."
      >
        <UnsupportedState
          title="Nothing to compare"
          explanation={
            <>
              No area has a published value for {analysis.period} at{' '}
              {selection.areaType.label.toLowerCase()}. No placeholder values are drawn.
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
        period: analysis.notes.period,
        geography: selection.areaType.label,
        boundaryVintage: selection.areaType.boundaryVintage,
        unit: indicator.unit ?? 'not stated',
        source: indicator.dataSource ?? 'Not stated',
      }}
      limitation={limitation}
      onExport={() =>
        downloadSvg(
          renderDotWhiskerSvg({
            rows, indicator, benchmark, benchmarkLabel: 'England',
            title, subtitle, notes: analysis.notes, width: 900,
          }),
          `${slug(indicator.shortName)}-comparison-${slug(analysis.period)}`,
        )
      }
      exportLabel="Export SVG"
      accessibleDescription={
        `${title} ${subtitle}. ` +
        rows
          .map((row) =>
            isPresent(row.observation)
              ? `${row.areaName}: ${row.observation.value}` +
                (row.observation.lowerCi95 !== null
                  ? `, 95% CI ${row.observation.lowerCi95} to ${row.observation.upperCi95}`
                  : ', no interval published')
              : `${row.areaName}: ${row.observation.state}`,
          )
          .join('. ')
      }
      actions={
        selectedCodes.length === 0 ? (
          <span className="font-figure text-2xs text-slate-500">
            Select areas to compare
          </span>
        ) : null
      }
    >
      <div className="space-y-1">
        <InlineSvgChart
          render={render}
          ariaLabel={`${title} ${subtitle}`}
          className="[&_svg]:h-auto [&_svg]:w-full"
          minWidth={380}
        />
        {/* Rows are clickable through the table equivalent; keyboard users use it. */}
        <div className="flex flex-wrap gap-1 px-2 pb-1 no-print">
          {rows.slice(0, 8).map((row) => (
            <button
              key={row.areaCode}
              type="button"
              onClick={() => onSelect(row.areaCode)}
              className="rounded border border-slate-200 px-1.5 py-0.5 font-figure text-2xs
                         text-slate-600 hover:border-brass-400 hover:text-oxford-900
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700"
            >
              {row.areaName}
            </button>
          ))}
        </div>
      </div>
    </FigureFrame>
  );
}
