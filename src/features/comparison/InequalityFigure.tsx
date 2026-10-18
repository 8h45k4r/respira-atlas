import { useCallback, useMemo, useState } from 'react';
import type { AtlasState } from '@/state/atlas-state';
import type { AreaRegistry } from '@/geography/model';
import type { ResolvedSelection, Analysis } from '@/features/atlas/useAnalysis';
import { useSubgroups } from '@/hooks/useSubgroups';
import { renderDotWhiskerSvg, type DotWhiskerRow } from '@/export/chart-svg';
import { InlineSvgChart } from '@/charts/InlineSvgChart';
import { FigureFrame } from '@/components/common/FigureFrame';
import { UnsupportedState, LoadingState } from '@/components/common/states';
import { isPresent } from '@/data/schemas/observation';
import { formatWithUnit } from '@/data/selectors/format';
import { downloadSvg } from '@/export/download';
import { slug } from '@/lib/utils';

/**
 * Inequality comparison across the subgroups the publisher actually breaks the
 * indicator down by.
 *
 * Subgroups are compared only within a single area and period, which is the only
 * comparison the published breakdowns support. The gap between subgroups is
 * reported as a difference in the measure, never as an "inequality score", and
 * the figure says plainly that a gap between groups is not an explanation of it.
 */
export function InequalityFigure({
  selection, analysis, registry, state,
}: {
  selection: ResolvedSelection;
  analysis: Analysis;
  registry: AreaRegistry;
  state: AtlasState;
}) {
  const [open, setOpen] = useState(false);
  const availability = selection.availability;
  const { observations, loading, error } = useSubgroups(availability, open);
  const { indicator } = selection;

  const area = state.selectedAreaCode ? registry.get(state.selectedAreaCode) : null;

  const rows: DotWhiskerRow[] = useMemo(() => {
    if (!area) return [];
    return observations
      .filter(
        (observation) =>
          observation.areaCode === area.code &&
          observation.period === analysis.period &&
          // Only sex/age breakdowns of the whole population, not category splits.
          observation.categoryType === null,
      )
      .map((observation, index) => ({
        areaCode: `${observation.areaCode}-${observation.sex}-${observation.age}`,
        areaName: [observation.sex, observation.age !== 'All ages' ? observation.age : null]
          .filter(Boolean)
          .join(', '),
        observation,
        isSelected: false,
        selectionIndex: index,
      }));
  }, [observations, area, analysis.period]);

  // The aggregate series is the comparison point for the subgroups.
  const allRows: DotWhiskerRow[] = useMemo(() => {
    if (!area || rows.length === 0) return [];
    const aggregate = analysis.selectedObservation;
    const base: DotWhiskerRow[] = aggregate
      ? [{
          areaCode: `${area.code}-all`,
          areaName: `${analysis.notes.population} (all)`,
          observation: aggregate,
          isSelected: true,
          selectionIndex: null,
        }]
      : [];
    return [...base, ...rows];
  }, [rows, area, analysis.selectedObservation, analysis.notes.population]);

  const gap = useMemo(() => {
    const present = rows.map((row) => row.observation).filter(isPresent);
    if (present.length < 2) return null;
    const sorted = [...present].sort((a, b) => b.value - a.value);
    return { high: sorted[0], low: sorted[sorted.length - 1] };
  }, [rows]);

  const render = useCallback(
    (width: number) =>
      renderDotWhiskerSvg({
        rows: allRows, indicator, benchmark: null, benchmarkLabel: 'England',
        title: '', subtitle: '', notes: null, width, standalone: false,
      }),
    [allRows, indicator],
  );

  if (!availability.subgroupFile || availability.subgroupRowCount === 0) {
    return null;
  }

  if (!open) {
    return (
      <FigureFrame
        question={`How does ${indicator.shortName.toLowerCase()} differ between population subgroups?`}
        meta={{
          population: analysis.notes.population, period: analysis.notes.period,
          geography: selection.areaType.label, unit: indicator.unit ?? '',
          source: indicator.dataSource ?? '',
        }}
        limitation="Subgroup breakdowns are compared within one area and period only. A gap between groups describes the gap; it does not explain it."
      >
        <div className="flex flex-col items-start gap-2 p-5">
          <p className="text-xs leading-relaxed text-slate-700">
            The publisher breaks this indicator down by{' '}
            {availability.sexes.filter((sex) => sex !== 'Persons').join(' and ') ||
              'population subgroup'}
            {availability.categoryTypes.length > 0
              ? `, and by ${availability.categoryTypes.join(', ').toLowerCase()}`
              : ''}
            . Those breakdowns are a separate, larger download, so they load on request.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium
                       text-navy-800 hover:bg-slate-50 focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            Load subgroup breakdowns
          </button>
        </div>
      </FigureFrame>
    );
  }

  return (
    <FigureFrame
      question={
        area
          ? `How does ${indicator.shortName.toLowerCase()} differ between subgroups in ${area.name}?`
          : `How does ${indicator.shortName.toLowerCase()} differ between population subgroups?`
      }
      indicatorName={indicator.name}
      meta={{
        population: 'subgroup breakdown',
        period: analysis.notes.period,
        geography: selection.areaType.label,
        boundaryVintage: selection.areaType.boundaryVintage,
        unit: indicator.unit ?? 'not stated',
        source: indicator.dataSource ?? 'Not stated',
      }}
      limitation="A difference between subgroups is a description of that difference, not an explanation of it. These groups differ in many ways besides the one labelled, and the comparison is valid only within this area and period."
      onExport={
        allRows.length > 0
          ? () =>
              downloadSvg(
                renderDotWhiskerSvg({
                  rows: allRows, indicator, benchmark: null, benchmarkLabel: 'England',
                  title: `${indicator.shortName} by subgroup${area ? ` — ${area.name}` : ''}`,
                  subtitle: `${selection.areaType.label}, ${analysis.period}`,
                  notes: analysis.notes, width: 900,
                }),
                `${slug(indicator.shortName)}-subgroups-${slug(area?.name ?? 'area')}`,
              )
          : undefined
      }
      exportLabel="Export SVG"
      evidence={
        gap ? (
          <>
            The gap between the highest and lowest published subgroup is{' '}
            <strong>
              {formatWithUnit(Math.abs(gap.high.value - gap.low.value), indicator)}
            </strong>
            {' '}({gap.high.sex} {formatWithUnit(gap.high.value, indicator)} against{' '}
            {gap.low.sex} {formatWithUnit(gap.low.value, indicator)}). This is the size of
            the difference, not evidence about its cause.
          </>
        ) : null
      }
    >
      {loading ? (
        <LoadingState label="Loading subgroup breakdowns…" />
      ) : error ? (
        <UnsupportedState title="Subgroups could not be loaded" explanation={error.message} />
      ) : !area ? (
        <UnsupportedState
          title="Select an area"
          explanation="Subgroup breakdowns are published per area, so a place must be selected before they can be compared."
        />
      ) : allRows.length === 0 ? (
        <UnsupportedState
          title="No subgroup breakdown for this area and period"
          explanation={`No subgroup values are published for ${area.name} in ${analysis.period}.`}
        />
      ) : (
        <InlineSvgChart
          render={render}
          ariaLabel={`Subgroup comparison for ${area.name} in ${analysis.period}`}
          className="[&_svg]:h-auto [&_svg]:w-full"
        />
      )}
    </FigureFrame>
  );
}
