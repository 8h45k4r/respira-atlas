import { useCallback, useMemo, useState } from 'react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import type { AreaRegistry } from '@/geography/model';
import type { ResolvedSelection, Analysis } from '@/features/atlas/useAnalysis';
import { useObservations } from '@/hooks/useObservations';
import { renderScatterSvg } from '@/export/chart-svg';
import { InlineSvgChart } from '@/charts/InlineSvgChart';
import { FigureFrame } from '@/components/common/FigureFrame';
import { UnsupportedState, LoadingState } from '@/components/common/states';
import { Label } from '@/components/ui/misc';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { isPresent } from '@/data/schemas/observation';
import { downloadSvg } from '@/export/download';
import { slug } from '@/lib/utils';

/**
 * Exposure/outcome scatter across areas.
 *
 * The second indicator is restricted to those published at the same geography,
 * and the two series must share a period before a single point is plotted —
 * pairing an outcome in one year with an exposure in another would manufacture a
 * relationship out of a mismatch. No fitted line or correlation statistic is
 * drawn; see renderScatterSvg for why.
 */
export function ScatterFigure({
  catalogue, state, selection, analysis, registry, onChange,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  selection: ResolvedSelection;
  analysis: Analysis;
  registry: AreaRegistry;
  onChange: (patch: Partial<AtlasState>) => void;
}) {
  const [open, setOpen] = useState(state.scatterIndicatorId !== null);

  // Only indicators published at the same geography can be paired at all.
  const candidates = useMemo(
    () =>
      catalogue.indicators.filter(
        (indicator) =>
          indicator.id !== selection.indicator.id &&
          Boolean(indicator.geographies[selection.areaType.key]),
      ),
    [catalogue.indicators, selection],
  );

  const other = catalogue.indicators.find(
    (indicator) => indicator.id === state.scatterIndicatorId,
  );
  const otherAvailability = other?.geographies[selection.areaType.key] ?? null;
  const otherObservations = useObservations(open ? otherAvailability : null);

  if (candidates.length === 0) {
    return null;
  }

  return (
    <FigureFrame
      question={
        other
          ? `Do areas with higher ${other.shortName.toLowerCase()} also have higher ${selection.indicator.shortName.toLowerCase()}?`
          : 'Does a second measure vary alongside this one across the same areas?'
      }
      indicatorName={
        other ? `${other.name} against ${selection.indicator.name}` : undefined
      }
      meta={{
        population: analysis.notes.population,
        period: analysis.notes.period,
        geography: selection.areaType.label,
        boundaryVintage: selection.areaType.boundaryVintage,
        unit: other ? `${other.unit} against ${selection.indicator.unit}` : '—',
        source: selection.indicator.dataSource ?? 'Not stated',
      }}
      limitation="Both axes are area-level measures. Any pattern describes areas, not people: an area-level association cannot be read as an individual-level or causal relationship. This is the ecological fallacy, and it is the reason no trend line or correlation coefficient is drawn."
      actions={
        <div className="w-56">
          <Label htmlFor="scatter-indicator" className="sr-only">
            Second indicator
          </Label>
          <Select
            value={other ? String(other.id) : 'none'}
            onValueChange={(value) => {
              const next = value === 'none' ? null : Number(value);
              setOpen(next !== null);
              onChange({ scatterIndicatorId: next });
            }}
          >
            <SelectTrigger id="scatter-indicator" className="h-8 text-xs">
              <SelectValue placeholder="Choose a second indicator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No second indicator</SelectItem>
              {candidates.map((indicator) => (
                <SelectItem
                  key={indicator.id}
                  value={String(indicator.id)}
                  hint={`${indicator.unit} · ${indicator.domainLabel}`}
                >
                  {indicator.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <ScatterBody
        selection={selection}
        analysis={analysis}
        registry={registry}
        state={state}
        other={other ?? null}
        otherObservations={otherObservations}
      />
    </FigureFrame>
  );
}

function ScatterBody({
  selection, analysis, registry, state, other, otherObservations,
}: {
  selection: ResolvedSelection;
  analysis: Analysis;
  registry: AreaRegistry;
  state: AtlasState;
  other: Catalogue['indicators'][number] | null;
  otherObservations: ReturnType<typeof useObservations>;
}) {
  const points = useMemo(() => {
    if (!other || !otherObservations || otherObservations.status !== 'ready') return null;
    const set = otherObservations.value;

    // The two indicators must share this exact period, or no point is plotted.
    const series =
      set.periodSeries.find((s) => s.periods.includes(analysis.period)) ?? null;
    if (!series) return { mismatch: true as const, rows: [] };

    const otherByArea = new Map(
      set.observations
        .filter((observation) => observation.period === analysis.period)
        .map((observation) => [observation.areaCode, observation]),
    );

    const rows = analysis.observationsForPeriod.flatMap((outcome) => {
      if (!isPresent(outcome)) return [];
      const exposure = otherByArea.get(outcome.areaCode);
      if (!isPresent(exposure)) return [];
      return [{
        areaCode: outcome.areaCode,
        areaName: registry.get(outcome.areaCode)?.name ?? outcome.areaCode,
        x: exposure.value,
        y: outcome.value,
        isSelected: outcome.areaCode === state.selectedAreaCode,
      }];
    });
    return { mismatch: false as const, rows };
  }, [other, otherObservations, analysis, registry, state.selectedAreaCode]);

  const render = useCallback(
    (width: number) =>
      renderScatterSvg({
        points: points?.rows ?? [],
        xIndicator: other!,
        yIndicator: selection.indicator,
        title: '', subtitle: '', notes: null,
        width, height: 300, standalone: false,
      }),
    [points, other, selection.indicator],
  );

  if (!other) {
    return (
      <UnsupportedState
        title="Choose a second indicator"
        explanation={
          <>
            Only indicators published for {selection.areaType.label.toLowerCase()} can be
            paired with this one, so the list is restricted to those.
          </>
        }
      />
    );
  }
  if (!otherObservations || otherObservations.status === 'loading') {
    return <LoadingState label={`Loading ${other.shortName.toLowerCase()}…`} />;
  }
  if (otherObservations.status === 'error') {
    return (
      <UnsupportedState
        title="That indicator could not be loaded"
        explanation={otherObservations.error.message}
      />
    );
  }
  if (points?.mismatch) {
    return (
      <UnsupportedState
        title="These two indicators do not share this period"
        explanation={
          <>
            {other.shortName} is not published for {analysis.period}. Pairing an outcome
            in one period with an exposure measured in another would create a
            relationship out of a mismatch, so no points are plotted. Change the period,
            or choose an indicator published for it.
          </>
        }
      />
    );
  }
  if (!points || points.rows.length < 3) {
    return (
      <UnsupportedState
        title="Too few areas have both values"
        explanation={
          <>
            Only {points?.rows.length ?? 0} area(s) have a published value for both
            measures in {analysis.period}. No scatter is drawn.
          </>
        }
      />
    );
  }

  return (
    <div className="space-y-1">
      <InlineSvgChart
        render={render}
        ariaLabel={
          `Scatter of ${other.shortName} against ${selection.indicator.shortName} across ` +
          `${points.rows.length} areas in ${analysis.period}. No trend line is shown.`
        }
        className="[&_svg]:h-auto [&_svg]:w-full"
      />
      <div className="px-2 pb-1 no-print">
        <button
          type="button"
          onClick={() =>
            downloadSvg(
              renderScatterSvg({
                points: points.rows,
                xIndicator: other,
                yIndicator: selection.indicator,
                title: `${other.shortName} against ${selection.indicator.shortName}`,
                subtitle: `${selection.areaType.label}, ${analysis.period}`,
                notes: analysis.notes, width: 900,
              }),
              `${slug(selection.indicator.shortName)}-vs-${slug(other.shortName)}`,
            )
          }
          className="rounded border border-slate-200 px-1.5 py-0.5 font-figure text-2xs
                     text-slate-600 hover:border-brass-400 hover:text-oxford-900
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700"
        >
          Export scatter SVG
        </button>
      </div>
    </div>
  );
}
