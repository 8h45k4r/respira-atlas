import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, Share2, Check } from 'lucide-react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import { MAX_COMPARISON_AREAS, stateToUrl } from '@/state/atlas-state';
import { useGeographyLayer } from '@/hooks/useGeographyLayer';
import { useObservations } from '@/hooks/useObservations';
import { resolveSelection, useAnalysis, type ResolvedSelection } from './useAnalysis';
import type { AreaRegistry } from '@/geography/model';
import type { ObservationSet } from '@/data/loader';
import { Controls } from './Controls';
import { AreaDetailPanel } from './AreaDetailPanel';
import { UKChoropleth } from '@/charts/UKChoropleth';
import { MapLegend } from './MapLegend';
import { TrendFigure } from './TrendFigure';
import { ComparisonFigure } from './ComparisonFigure';
import { FigureFrame } from '@/components/common/FigureFrame';
import { AreaTable } from '@/components/common/AreaTable';
import { AreaSearch, type AreaSearchResolution } from '@/components/common/AreaSearch';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Badge, LiveRegion } from '@/components/ui/misc';
import { buildBreadcrumb } from '@/geography/model';
import { ExportDialog } from '@/features/briefing/ExportDialog';
import { useSettlementIndex } from '@/hooks/useSettlementIndex';
import { ScatterFigure } from '@/features/comparison/ScatterFigure';
import { InequalityFigure } from '@/features/comparison/InequalityFigure';

export function ExploreView({
  catalogue, state, onChange, onReset,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  onChange: (patch: Partial<AtlasState>) => void;
  onReset: () => void;
}) {
  const { resolved, corrections } = useMemo(
    () => resolveSelection(catalogue, state),
    [catalogue, state],
  );
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const layer = useGeographyLayer(resolved?.areaType ?? null);
  const observations = useObservations(resolved?.availability ?? null);

  const onResolveSearch = useCallback(
    (resolution: AreaSearchResolution) => {
      setSearchNotice(resolution.notice);
      if (resolution.entry.kind === 'nation') {
        onChange({ nationFocus: resolution.entry.name, selectedAreaCode: null });
        return;
      }
      onChange({
        selectedAreaCode: resolution.entry.code,
        areaTypeKey: resolution.entry.areaTypeKey,
        nationFocus: resolution.entry.nation,
      });
    },
    [onChange],
  );

  if (!resolved) {
    return (
      <EmptyState
        title="No indicator is available for this geography mode"
        explanation={
          <>
            This release publishes {catalogue.indicators.length} indicators, none of which is
            available at the geography currently selected. Switch geography mode, or open the
            coverage matrix to see exactly what is published where.
          </>
        }
      />
    );
  }

  if (!layer || layer.status === 'loading' || !observations || observations.status === 'loading') {
    return <LoadingState label={`Loading ${resolved.areaType.label.toLowerCase()} and observations…`} />;
  }
  if (layer.status === 'error') {
    return (
      <ErrorState
        title="The boundary data could not be loaded"
        error={layer.error}
        onRetry={layer.retry}
      />
    );
  }
  if (observations.status === 'error') {
    return (
      <ErrorState
        title="The observations could not be loaded"
        error={observations.error}
        onRetry={observations.retry}
      />
    );
  }

  return (
    <ExploreBody
      catalogue={catalogue}
      state={state}
      selection={resolved}
      registry={layer.value}
      observations={observations.value}
      corrections={corrections}
      searchNotice={searchNotice}
      onDismissNotice={() => setSearchNotice(null)}
      onResolveSearch={onResolveSearch}
      onChange={onChange}
      onReset={onReset}
      copied={copied}
      setCopied={setCopied}
      exportOpen={exportOpen}
      setExportOpen={setExportOpen}
    />
  );
}

type ExploreBodyProps = {
  catalogue: Catalogue;
  state: AtlasState;
  selection: ResolvedSelection;
  registry: AreaRegistry;
  observations: ObservationSet;
  corrections: string[];
  searchNotice: string | null;
  onDismissNotice: () => void;
  onResolveSearch: (resolution: AreaSearchResolution) => void;
  onChange: (patch: Partial<AtlasState>) => void;
  onReset: () => void;
  copied: boolean;
  setCopied: (value: boolean) => void;
  exportOpen: boolean;
  setExportOpen: (value: boolean) => void;
};

function ExploreBody({
  catalogue, state, selection, registry, observations, corrections,
  searchNotice, onDismissNotice, onResolveSearch, onChange, onReset,
  copied, setCopied, exportOpen, setExportOpen,
}: ExploreBodyProps) {
  const analysis = useAnalysis({ catalogue, state, selection, registry, observations });
  const [wantSettlements, setWantSettlements] = useState(false);
  const settlements = useSettlementIndex(
    wantSettlements, catalogue.manifest, catalogue.search.settlementFile,
  );
  const selectedArea = state.selectedAreaCode ? registry.get(state.selectedAreaCode) : undefined;
  const breadcrumb = buildBreadcrumb(state.nationFocus, selectedArea ?? null);

  const onSelectArea = useCallback(
    (code: string) => {
      const area = registry.get(code);
      onChange({
        selectedAreaCode: code,
        nationFocus: area?.nation ?? state.nationFocus,
      });
    },
    [registry, onChange, state.nationFocus],
  );

  const toggleComparison = useCallback(
    (code: string) => {
      const current = state.comparisonAreaCodes;
      const next = current.includes(code)
        ? current.filter((candidate) => candidate !== code)
        : current.length >= MAX_COMPARISON_AREAS
          ? current
          : [...current, code];
      onChange({ comparisonAreaCodes: next });
    },
    [state.comparisonAreaCodes, onChange],
  );

  const share = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(stateToUrl(state));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard permission can be refused; the URL bar already holds the state.
      setCopied(false);
    }
  }, [state, setCopied]);

  const allNotices = [...corrections, ...analysis.corrections];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <LiveRegion
        message={
          selectedArea
            ? `Selected ${selectedArea.name}. ${analysis.evidence?.observed ?? ''}`
            : `Showing ${analysis.viewModel.counts.withValue} areas with a value for ${analysis.period}.`
        }
      />

      {/* Breadcrumb and back */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-1.5 no-print">
        <Button
          variant="ghost"
          size="sm"
          disabled={!selectedArea && !state.nationFocus}
          onClick={() =>
            selectedArea
              ? onChange({ selectedAreaCode: null })
              : onChange({ nationFocus: null })
          }
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
        <nav aria-label="Geography breadcrumb" className="min-w-0">
          <ol className="flex flex-wrap items-center gap-1 font-figure text-2xs text-slate-600">
            {breadcrumb.map((step, index) => (
              <li key={`${step.kind}-${step.code ?? index}`} className="flex items-center gap-1">
                {index > 0 ? <span aria-hidden className="text-slate-400">/</span> : null}
                {index === breadcrumb.length - 1 ? (
                  <span aria-current="page" className="font-semibold text-oxford-900">
                    {step.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700"
                    onClick={() =>
                      step.kind === 'uk'
                        ? onChange({ nationFocus: null, selectedAreaCode: null })
                        : onChange({ selectedAreaCode: null })
                    }
                  >
                    {step.label}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {state.comparisonAreaCodes.length > 0 ? (
            <Badge tone="brass">
              {state.comparisonAreaCodes.length} of {MAX_COMPARISON_AREAS} compared
            </Badge>
          ) : null}
          <Button variant="outline" size="sm" onClick={share}>
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Share2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied ? 'Link copied' : 'Share this view'}
          </Button>
        </div>
      </div>

      {allNotices.length > 0 ? (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-1.5" role="status">
          <ul className="space-y-0.5 text-2xs text-amber-900">
            {allNotices.map((notice) => <li key={notice}>{notice}</li>)}
          </ul>
        </div>
      ) : null}

      {searchNotice ? (
        <div className="flex items-start gap-2 border-b border-brass-200 bg-brass-50 px-3 py-2" role="status">
          <p className="flex-1 text-xs text-brass-900">{searchNotice}</p>
          <Button variant="ghost" size="sm" onClick={onDismissNotice}>Dismiss</Button>
        </div>
      ) : null}

      {/* Desktop: map-led split. Tablet/mobile: a coherent stack. */}
      <div className="grid min-h-0 flex-1 gap-2 p-2 lg:grid-cols-[17rem_minmax(0,1fr)_19rem]">
        <div className="order-1 space-y-3 lg:order-none">
          <div className="panel p-3 no-print">
            <AreaSearch
              entries={catalogue.search.entries}
              settlements={settlements.entries}
              settlementsLoading={settlements.loading}
              onFirstInput={() => setWantSettlements(true)}
              mode={state.geographyMode}
              areaTypeKey={selection.areaType.key}
              onResolve={onResolveSearch}
            />
          </div>
          <div className="panel p-3 no-print">
            <Controls
              catalogue={catalogue}
              state={state}
              selection={{ ...selection, period: analysis.period }}
              observations={observations}
              onChange={onChange}
              onReset={onReset}
            />
          </div>
        </div>

        <div className="order-2 flex min-w-0 flex-col gap-2 lg:order-none">
          <FigureFrame
            question={analysis.question}
            indicatorName={selection.indicator.name}
            meta={{
              population: analysis.notes.population,
              period: analysis.notes.period,
              geography: selection.areaType.label,
              boundaryVintage: selection.areaType.boundaryVintage,
              unit: selection.indicator.unit ?? 'not stated',
              source: selection.indicator.dataSource ?? 'Not stated',
            }}
            coverageLabel={`${selection.indicator.coverage.nations.join(', ')} coverage`}
            caveats={[
              ...(analysis.viewModel.counts.outsideCoverage > 0
                ? [{ kind: 'coverage' as const, label: `${selection.indicator.coverage.nations.join(' and ')} only` }]
                : []),
              { kind: 'areas', label: 'Area-level, not people' },
              { kind: 'not-causal', label: 'Pattern, not cause' },
              { kind: 'recording', label: 'Reflects recording too' },
            ]}
            limitation={
              <>
                {analysis.viewModel.coverageNote
                  ? `${analysis.viewModel.coverageNote} `
                  : ''}
                This map shows a descriptive, area-level measure. Differences between
                areas are not evidence of a cause, and a higher or lower value may
                reflect how cases are found and recorded as well as how much disease
                there is.
              </>
            }
            accessibleDescription={analysis.viewModel.subtitle}
            onExport={() => setExportOpen(true)}
            exportLabel="Export map"
            table={
              <AreaTable
                areas={analysis.viewModel.areas}
                indicator={selection.indicator}
                selectedCode={state.selectedAreaCode}
                comparisonCodes={state.comparisonAreaCodes}
                onSelect={onSelectArea}
                caption={`${selection.indicator.name} by ${selection.areaType.label}, ${analysis.period}`}
              />
            }
          >
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_13rem]">
              <UKChoropleth
                viewModel={analysis.viewModel}
                onSelect={onSelectArea}
                layerKey={selection.areaType.key}
                ariaLabel={`${analysis.question} ${analysis.viewModel.subtitle}`}
                coveredLabel={selection.indicator.coverage.nations.join(' and ')}
                height={520}
              />
              <MapLegend viewModel={analysis.viewModel} indicator={selection.indicator} />
            </div>
          </FigureFrame>

          <div className="grid items-start gap-2 xl:grid-cols-2">
            <TrendFigure
              catalogue={catalogue}
              selection={selection}
              observations={observations}
              analysis={analysis}
              state={state}
              registry={registry}
            />
            <ComparisonFigure
              selection={selection}
              observations={observations}
              analysis={analysis}
              state={state}
              registry={registry}
              onSelect={onSelectArea}
              onChange={onChange}
            />
          </div>

          <InequalityFigure
            selection={selection}
            analysis={analysis}
            registry={registry}
            state={state}
          />

          <ScatterFigure
            catalogue={catalogue}
            state={state}
            selection={selection}
            analysis={analysis}
            registry={registry}
            onChange={onChange}
          />
        </div>

        <div className="order-3 min-h-0 lg:order-none">
          {selectedArea ? (
            <AreaDetailPanel
              area={selectedArea}
              observation={analysis.selectedObservation}
              benchmark={analysis.benchmarkObservation}
              flagLevel={observations.flagLevel}
              observations={observations}
              sex={analysis.sex}
              periodSeries={analysis.periodSeries}
              indicator={selection.indicator}
              evidence={analysis.evidence}
              period={analysis.period}
              inComparison={state.comparisonAreaCodes.includes(selectedArea.code)}
              comparisonCount={state.comparisonAreaCodes.length}
              onClose={() => onChange({ selectedAreaCode: null })}
              onToggleComparison={() => toggleComparison(selectedArea.code)}
            />
          ) : (
            <div className="panel p-4">
              <h2 className="text-sm font-semibold text-oxford-900">Select a place</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                Click the map, search, or use the keyboard-friendly data table.
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-1.5">
                {([
                  ['With a value', analysis.viewModel.counts.withValue, 'bg-oxford-700'],
                  ['No value published', analysis.viewModel.counts.missing, 'bg-slate-200'],
                  ['Suppressed', analysis.viewModel.counts.suppressed, 'bg-slate-300'],
                  ['Outside dataset coverage', analysis.viewModel.counts.outsideCoverage, 'bg-slate-100'],
                ] as const).map(([label, count, swatch]) => (
                  <div key={label} className="flex flex-col-reverse rounded-md border border-slate-200 bg-white px-2 py-1.5">
                    <dt className="mt-1 font-figure text-2xs text-slate-500">{label}</dt>
                    <dd className="flex items-center gap-1.5 text-lg font-semibold tabular-nums leading-none text-oxford-900">
                      <span aria-hidden className={`h-2.5 w-2.5 rounded-sm border border-slate-300 ${swatch}`} />
                      {count}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        state={state}
        selection={selection}
        analysis={analysis}
      />
    </div>
  );
}
