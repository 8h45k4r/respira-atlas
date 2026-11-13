import { useCallback, useMemo } from 'react';
import type { AtlasState, RankingView } from '@/state/atlas-state';
import type { ObservationSet } from '@/data/loader';
import type { AreaRegistry } from '@/geography/model';
import type { ResolvedSelection, Analysis } from './useAnalysis';
import { renderDotWhiskerSvg, type DotWhiskerRow } from '@/export/chart-svg';
import { InlineSvgChart } from '@/charts/InlineSvgChart';
import { FigureFrame } from '@/components/common/FigureFrame';
import { UnsupportedState } from '@/components/common/states';
import { isPresent, type Observation } from '@/data/schemas/observation';
import { checkComparable, describeIncompatibility } from '@/data/selectors/comparison';
import {
  rankByValue, rankLookup, rankWindow, rankExtremes, type RankedEntry,
} from '@/data/selectors/ranking';
import { selectionOrder } from '@/charts/palette';
import { downloadSvg } from '@/export/download';
import { cn, slug } from '@/lib/utils';

const NEIGHBOURS_EACH_SIDE = 5;
const PER_END = 7;

type ConcreteView = Exclude<RankingView, 'auto'>;

/**
 * Ranked dot-and-interval comparison, linked to the selection.
 *
 * Three views of one sorted distribution:
 * - around: the selected area and its nearest neighbours in value;
 * - extremes: the two ends of the distribution, with the selected area placed
 *   at its true rank between them;
 * - compared: the selected and compared areas only.
 *
 * Every pair is checked for compatibility first — same geography, boundary
 * vintage, period, pooling and subgroup — and a blocked comparison states why
 * rather than drawing something invalid.
 */
export function ComparisonFigure({
  selection, observations, analysis, state, registry, onSelect, onChange,
}: {
  selection: ResolvedSelection;
  observations: ObservationSet;
  analysis: Analysis;
  state: AtlasState;
  registry: AreaRegistry;
  onSelect: (code: string) => void;
  onChange: (patch: Partial<AtlasState>) => void;
}) {
  const { indicator } = selection;
  const hasIntervals = selection.availability.hasConfidenceIntervals;
  const selectedCode = state.selectedAreaCode;

  const codes = useMemo(
    () => selectionOrder(selectedCode, state.comparisonAreaCodes),
    [selectedCode, state.comparisonAreaCodes],
  );
  const hasComparisons = codes.length > (selectedCode ? 1 : 0);

  const view: ConcreteView = useMemo(() => {
    const requested = state.rankingView;
    if (requested === 'around' && selectedCode) return 'around';
    if (requested === 'compared' && hasComparisons) return 'compared';
    if (requested === 'extremes') return 'extremes';
    // 'auto', or a requested view the current selection cannot support.
    if (hasComparisons) return 'compared';
    if (selectedCode) return 'around';
    return 'extremes';
  }, [state.rankingView, selectedCode, hasComparisons]);

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

  const ranked = useMemo(
    () => rankByValue(analysis.observationsForPeriod),
    [analysis.observationsForPeriod],
  );

  const rows: DotWhiskerRow[] = useMemo(() => {
    const ranks = rankLookup(ranked);
    const position = new Map(ranked.map((entry, index) => [entry.observation.areaCode, index]));
    const byCode = new Map<string, Observation>(
      analysis.observationsForPeriod.map((observation) => [observation.areaCode, observation]),
    );

    const toRow = (code: string, observation: Observation, gapBefore = false): DotWhiskerRow => {
      const index = codes.indexOf(code);
      return {
        areaCode: code,
        areaName: registry.get(code)?.name ?? code,
        observation,
        isSelected: code === selectedCode,
        selectionIndex: index >= 0 ? index : null,
        rank: ranks.get(code) ?? null,
        gapBefore,
      };
    };

    // Rows in rank order, with a visible break wherever ranks were skipped.
    const fromEntries = (entries: readonly RankedEntry[]): DotWhiskerRow[] =>
      entries.map((entry, index) => {
        const previous = entries[index - 1];
        const gap =
          previous !== undefined &&
          (position.get(entry.observation.areaCode) ?? 0) -
            (position.get(previous.observation.areaCode) ?? 0) > 1;
        return toRow(entry.observation.areaCode, entry.observation, gap);
      });

    // An area with no value cannot be ranked; it is listed after the ranked
    // rows with its reason, never placed as if it had a value.
    const unranked = (code: string | null): DotWhiskerRow[] => {
      if (!code || position.has(code)) return [];
      const observation = byCode.get(code);
      return observation ? [toRow(code, observation, true)] : [];
    };

    if (view === 'compared') {
      return codes.flatMap((code) => {
        const observation = byCode.get(code);
        return observation ? [toRow(code, observation)] : [];
      }).sort((a, b) => {
        const av = isPresent(a.observation) ? a.observation.value : -Infinity;
        const bv = isPresent(b.observation) ? b.observation.value : -Infinity;
        return bv - av;
      });
    }

    if (view === 'around' && selectedCode) {
      const window = rankWindow(ranked, selectedCode, NEIGHBOURS_EACH_SIDE);
      if (window) return fromEntries(window);
    }

    const ends = rankExtremes(ranked, PER_END);
    const selectedEntry = ranked.find((entry) => entry.observation.areaCode === selectedCode);
    const merged = selectedEntry && !ends.includes(selectedEntry)
      ? [...ends, selectedEntry].sort(
          (a, b) =>
            (position.get(a.observation.areaCode) ?? 0) -
            (position.get(b.observation.areaCode) ?? 0),
        )
      : ends;
    return [...fromEntries(merged), ...unranked(selectedCode)];
  }, [ranked, analysis.observationsForPeriod, codes, registry, selectedCode, view]);

  const benchmark = isPresent(analysis.benchmarkObservation)
    ? analysis.benchmarkObservation
    : null;

  const selectedName = selectedCode ? registry.get(selectedCode)?.name ?? selectedCode : null;
  const areaLabel = selection.areaType.label.toLowerCase();
  const measure = indicator.shortName.toLowerCase();

  const title =
    view === 'compared'
      ? 'How do the selected areas compare with England, and is the difference supported by the intervals?'
      : view === 'around' && selectedName
        ? `Where does ${selectedName} sit among ${areaLabel} for ${measure}?`
        : `Where is ${measure} highest and lowest, and do the intervals overlap?`;

  const subtitle =
    `${rows.length} of ${ranked.length} ${areaLabel} with a value, ${analysis.period}. ` +
    'Rank 1 is the highest value, not the best.';

  const render = useCallback(
    (width: number) =>
      renderDotWhiskerSvg({
        rows, indicator, benchmark,
        benchmarkLabel: 'England', title, subtitle, notes: null,
        width, standalone: false, encodeSignificance: true,
        rankTotal: ranked.length, interactive: true,
      }),
    [rows, indicator, benchmark, title, subtitle, ranked.length],
  );

  const limitation = hasIntervals
    ? 'Bars are the published 95% confidence intervals. A solid dot means the publisher ' +
      'flags the area as statistically different from England using its own test, which ' +
      'for some measures uses a 99.8% level, so a hollow dot can sit beside a 95% bar that ' +
      'misses England. Overlapping intervals are not a significance test and non-overlap is ' +
      'not proof of a difference. Ordering areas by value does not make a performance ' +
      'league table: neighbouring areas are usually not distinguishable from one another.'
    : 'No confidence intervals are published for this indicator at this geography, so the ' +
      'precision of each estimate is unknown.';

  const meta = {
    population: analysis.notes.population,
    period: analysis.notes.period,
    geography: selection.areaType.label,
    boundaryVintage: selection.areaType.boundaryVintage,
    unit: indicator.unit ?? 'not stated',
    source: indicator.dataSource ?? 'Not stated',
  };

  if (incompatibility) {
    return (
      <FigureFrame question={title} meta={meta} limitation="This comparison is blocked.">
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
        meta={meta}
        limitation="No comparable values are available for this selection."
      >
        <UnsupportedState
          title="Nothing to compare"
          explanation={
            <>
              No area has a published value for {analysis.period} at {areaLabel}. No
              placeholder values are drawn.
            </>
          }
        />
      </FigureFrame>
    );
  }

  const views: { key: ConcreteView; label: string; disabled: boolean; reason?: string }[] = [
    {
      key: 'around',
      label: selectedName ? `Around ${shorten(selectedName)}` : 'Around selection',
      disabled: !selectedCode,
      reason: 'Select an area first',
    },
    { key: 'extremes', label: 'Highest and lowest', disabled: false },
    {
      key: 'compared',
      label: `Compared (${codes.length})`,
      disabled: !hasComparisons,
      reason: 'Add areas to the comparison first',
    },
  ];

  return (
    <FigureFrame
      question={title}
      indicatorName={indicator.name}
      meta={meta}
      limitation={limitation}
      onExport={() =>
        downloadSvg(
          renderDotWhiskerSvg({
            rows, indicator, benchmark, benchmarkLabel: 'England',
            title, subtitle, notes: analysis.notes, width: 900,
            encodeSignificance: true, rankTotal: ranked.length,
          }),
          `${slug(indicator.shortName)}-comparison-${slug(analysis.period)}`,
        )
      }
      exportLabel="Export SVG"
      accessibleDescription={
        `${title} ${subtitle} ` +
        rows
          .map((row) =>
            isPresent(row.observation)
              ? `${row.rank !== null && row.rank !== undefined ? `Rank ${row.rank}, ` : ''}` +
                `${row.areaName}: ${row.observation.value}` +
                (row.observation.lowerCi95 !== null
                  ? `, 95% CI ${row.observation.lowerCi95} to ${row.observation.upperCi95}`
                  : ', no interval published') +
                (row.observation.significance !== 'not-compared'
                  ? `, publisher flag ${row.observation.significance}`
                  : '')
              : `${row.areaName}: ${row.observation.state}`,
          )
          .join('. ')
      }
    >
      <div className="space-y-1.5">
        <div
          role="group"
          aria-label="Which areas the ranking shows"
          className="flex flex-wrap gap-1 px-3 pt-2 no-print"
        >
          {views.map((option) => (
            <button
              key={option.key}
              type="button"
              disabled={option.disabled}
              title={option.disabled ? option.reason : undefined}
              aria-pressed={view === option.key}
              onClick={() => onChange({ rankingView: option.key })}
              className={cn(
                'rounded-md border px-2 py-1 font-figure text-2xs transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700',
                'disabled:cursor-not-allowed disabled:opacity-45',
                view === option.key
                  ? 'border-oxford-900 bg-oxford-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-oxford-700',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <InlineSvgChart
          render={render}
          ariaLabel={`${title} ${subtitle}`}
          className="px-1 [&_svg]:h-auto [&_svg]:w-full"
          minWidth={340}
          onAreaClick={onSelect}
        />
        {/* Keyboard route to the same selection the chart rows offer by pointer. */}
        <div className="flex flex-wrap items-center gap-1 px-3 pb-2 no-print">
          <span className="font-figure text-2xs text-slate-500">Select:</span>
          {rows.map((row) => (
            <button
              key={row.areaCode}
              type="button"
              onClick={() => onSelect(row.areaCode)}
              aria-current={row.isSelected ? 'true' : undefined}
              className={cn(
                'rounded border px-1.5 py-0.5 font-figure text-2xs',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700',
                row.isSelected
                  ? 'border-brass-500 bg-brass-50 font-semibold text-brass-900'
                  : 'border-slate-200 text-slate-600 hover:border-brass-400 hover:text-oxford-900',
              )}
            >
              {row.areaName}
            </button>
          ))}
        </div>
      </div>
    </FigureFrame>
  );
}

function shorten(name: string): string {
  return name.length > 22 ? `${name.slice(0, 21).trimEnd()}…` : name;
}
