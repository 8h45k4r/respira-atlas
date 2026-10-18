import { useCallback, useMemo, useState } from 'react';
import { ArrowRight, Share2, Check } from 'lucide-react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import { stateToUrl } from '@/state/atlas-state';
import { useGeographyLayer } from '@/hooks/useGeographyLayer';
import { useObservations } from '@/hooks/useObservations';
import { resolveSelection, useAnalysis } from '@/features/atlas/useAnalysis';
import { EvidencePanel, ProvenanceList } from '@/components/common/EvidencePanel';
import { FigureFrame } from '@/components/common/FigureFrame';
import { AreaSearch } from '@/components/common/AreaSearch';
import { InlineSvgChart } from '@/charts/InlineSvgChart';
import { renderMapSvg } from '@/export/map-svg';
import { renderDotWhiskerSvg, renderTimeSeriesSvg } from '@/export/chart-svg';
import { LoadingState, ErrorState, EmptyState, UnsupportedState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { isPresent } from '@/data/schemas/observation';
import { CHART_INK, SELECTION } from '@/charts/palette';
import { AreaTable } from '@/components/common/AreaTable';

/**
 * "Explain a finding".
 *
 * Takes a valid selection and turns it into a statement someone could defend in
 * a meeting: a descriptive headline, an annotated map, a comparison, a short
 * interpretation, the uncertainty, the provenance, and the questions that remain
 * open. The sections are generated from the same validated selectors the atlas
 * uses, so nothing here can assert more than the data support.
 */
export function ExplainView({
  catalogue, state, onChange,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  onChange: (patch: Partial<AtlasState>) => void;
}) {
  const { resolved } = useMemo(() => resolveSelection(catalogue, state), [catalogue, state]);
  const layer = useGeographyLayer(resolved?.areaType ?? null);
  const observations = useObservations(resolved?.availability ?? null);
  const [copied, setCopied] = useState(false);

  if (!resolved) {
    return <EmptyState title="Nothing to explain yet" explanation="No indicator is available for this geography mode." />;
  }
  if (!layer || layer.status === 'loading' || !observations || observations.status === 'loading') {
    return <LoadingState label="Loading the evidence…" />;
  }
  if (layer.status === 'error') {
    return <ErrorState title="Boundaries could not be loaded" error={layer.error} onRetry={layer.retry} />;
  }
  if (observations.status === 'error') {
    return <ErrorState title="Observations could not be loaded" error={observations.error} onRetry={observations.retry} />;
  }

  return (
    <ExplainBody
      catalogue={catalogue}
      state={state}
      onChange={onChange}
      selection={resolved}
      registry={layer.value}
      observations={observations.value}
      copied={copied}
      setCopied={setCopied}
    />
  );
}

function ExplainBody({
  catalogue, state, onChange, selection, registry, observations, copied, setCopied,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  onChange: (patch: Partial<AtlasState>) => void;
  selection: NonNullable<ReturnType<typeof resolveSelection>['resolved']>;
  registry: import('@/geography/model').AreaRegistry;
  observations: import('@/data/loader').ObservationSet;
  copied: boolean;
  setCopied: (value: boolean) => void;
}) {
  const analysis = useAnalysis({ catalogue, state, selection, registry, observations });
  const selectedArea = state.selectedAreaCode ? registry.get(state.selectedAreaCode) : undefined;
  const { indicator } = selection;

  const share = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(stateToUrl(state));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setCopied(false); }
  }, [state, setCopied]);

  const mapRender = useCallback(
    (width: number) =>
      renderMapSvg({
        viewModel: analysis.viewModel,
        notes: analysis.notes,
        composition: 'plot-only',
        textScale: 'standard',
        headline: null,
        headlineIsUserAuthored: false,
        width,
        height: Math.round(width * 1.08),
      }),
    [analysis.viewModel, analysis.notes],
  );

  // Computed unconditionally: hooks must not sit behind the early return below.
  const peers = useMemo(() => {
    if (!selectedArea) return [];
    const present = analysis.observationsForPeriod.filter(isPresent);
    const sorted = [...present].sort((a, b) => b.value - a.value);
    const index = sorted.findIndex((o) => o.areaCode === selectedArea.code);
    if (index < 0) return sorted.slice(0, 7);
    const start = Math.max(0, Math.min(index - 3, sorted.length - 7));
    return sorted.slice(start, start + 7);
  }, [analysis.observationsForPeriod, selectedArea]);

  if (!selectedArea) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h2 className="text-lg font-semibold text-oxford-900">Choose a place to explain</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          This workspace turns one selection into a statement you can defend: what was
          observed, how it compares with England, what uncertainty remains, and what you
          would need to know before recommending anything. Pick a place to begin.
        </p>
        <div className="mt-5 max-w-md">
          <AreaSearch
            entries={catalogue.search.entries}
            mode={state.geographyMode}
            areaTypeKey={selection.areaType.key}
            onResolve={(resolution) =>
              onChange({
                selectedAreaCode: resolution.entry.code,
                areaTypeKey: resolution.entry.areaTypeKey,
              })
            }
          />
        </div>
        <Button variant="link" className="mt-4 px-0" onClick={() => onChange({ mode: 'explore' })}>
          Or explore the map first
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    );
  }

  const evidence = analysis.evidence;
  const comparison = evidence?.comparisonDetail ?? null;

  return (
    <div className="mx-auto w-full max-w-[82rem] px-4 py-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">Evidence statement</p>
          <h2 className="mt-1 text-xl font-semibold leading-tight tracking-[-0.015em] text-oxford-900">
            {evidence?.unavailable
              ? `${indicator.shortName} in ${selectedArea.name}: no value available`
              : `${indicator.shortName} in ${selectedArea.name}, ${analysis.period}`}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            {selectedArea.areaTypeLabel} · {selectedArea.nation} · {selectedArea.code}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge tone="warn">Descriptive finding, not a causal claim</Badge>
          <Button variant="outline" size="sm" onClick={share}>
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Share2 className="h-3.5 w-3.5" aria-hidden />}
            {copied ? 'Link copied' : 'Share'}
          </Button>
          <Button variant="brass" size="sm" onClick={() => onChange({ mode: 'briefing' })}>
            Prepare a briefing
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          <FigureFrame
            question={analysis.question}
            indicatorName={indicator.name}
            meta={{
              population: analysis.notes.population,
              period: analysis.notes.period,
              geography: selection.areaType.label,
              boundaryVintage: selection.areaType.boundaryVintage,
              unit: indicator.unit ?? 'not stated',
              source: indicator.dataSource ?? 'Not stated',
            }}
            coverageLabel={`${indicator.coverage.nations.join(', ')} coverage`}
            limitation={
              analysis.viewModel.coverageNote ??
              'Area-level differences are descriptive. They do not identify a cause.'
            }
            evidence={
              evidence ? (
                <>
                  <strong>{selectedArea.name} is outlined.</strong> {evidence.observed}
                </>
              ) : null
            }
            table={
              <AreaTable
                areas={analysis.viewModel.areas}
                indicator={indicator}
                selectedCode={state.selectedAreaCode}
                comparisonCodes={state.comparisonAreaCodes}
                caption={`${indicator.name} by ${selection.areaType.label}, ${analysis.period}`}
              />
            }
          >
            <div className="mx-auto max-w-xl">
              <InlineSvgChart
                render={mapRender}
                ariaLabel={`Annotated map: ${analysis.viewModel.subtitle}. ${selectedArea.name} is outlined.`}
                className="[&_svg]:h-auto [&_svg]:w-full"
                minWidth={320}
              />
            </div>
          </FigureFrame>

          {peers.length > 1 ? (
            <FigureFrame
              question={`How does ${selectedArea.name} sit among comparable areas, and do the intervals overlap?`}
              indicatorName={indicator.name}
              meta={{
                population: analysis.notes.population,
                period: analysis.notes.period,
                geography: selection.areaType.label,
                unit: indicator.unit ?? 'not stated',
                source: indicator.dataSource ?? 'Not stated',
              }}
              limitation="Neighbouring areas in this ordering are usually not distinguishable from one another once their confidence intervals are taken into account. This is a position in a distribution, not a league table."
            >
              <InlineSvgChart
                render={(width) =>
                  renderDotWhiskerSvg({
                    rows: peers.map((observation) => ({
                      areaCode: observation.areaCode,
                      areaName: registry.get(observation.areaCode)?.name ?? observation.areaCode,
                      observation,
                      isSelected: observation.areaCode === selectedArea.code,
                      selectionIndex: observation.areaCode === selectedArea.code ? 0 : null,
                    })),
                    indicator,
                    benchmark: isPresent(analysis.benchmarkObservation)
                      ? analysis.benchmarkObservation
                      : null,
                    benchmarkLabel: 'England',
                    title: '', subtitle: '', notes: null,
                    width, standalone: false,
                  })
                }
                ariaLabel={`${selectedArea.name} compared with nearby areas in the distribution`}
                className="[&_svg]:h-auto [&_svg]:w-full"
              />
            </FigureFrame>
          ) : null}

          {analysis.periodSeries.periods.length >= 2 ? (
            <FigureFrame
              question={`How has this changed in ${selectedArea.name}?`}
              indicatorName={indicator.name}
              meta={{
                population: analysis.notes.population,
                period: `${analysis.periodSeries.periods[0]} to ${analysis.periodSeries.periods[analysis.periodSeries.periods.length - 1]}`,
                geography: selection.areaType.label,
                unit: indicator.unit ?? 'not stated',
                source: indicator.dataSource ?? 'Not stated',
              }}
              limitation={
                analysis.periodSeries.pooled
                  ? `Rolling ${analysis.periodSeries.years}-year pooled periods overlap, so consecutive points are not independent.`
                  : 'Gaps in the line are periods with no published value.'
              }
            >
              <InlineSvgChart
                render={(width) =>
                  renderTimeSeriesSvg({
                    series: [
                      {
                        label: selectedArea.name,
                        colour: SELECTION.stroke,
                        points: analysis.periodSeries.periods.map((period) => ({
                          period,
                          observation:
                            observations.byArea.get(selectedArea.code)?.get(period) ??
                            ({
                              areaCode: selectedArea.code, period,
                              sex: observations.sex, age: observations.age,
                              categoryType: null, category: null, state: 'missing' as const,
                              significance: 'not-compared' as const,
                              trend: 'not-available' as const, note: null,
                            }),
                        })),
                      },
                      {
                        label: 'England',
                        colour: CHART_INK.benchmark,
                        dashed: true,
                        points: analysis.periodSeries.periods.map((period) => ({
                          period,
                          observation:
                            observations.benchmarkByPeriod.get(period) ??
                            ({
                              areaCode: 'E92000001', period,
                              sex: observations.sex, age: observations.age,
                              categoryType: null, category: null, state: 'missing' as const,
                              significance: 'not-compared' as const,
                              trend: 'not-available' as const, note: null,
                            }),
                        })),
                      },
                    ],
                    periods: analysis.periodSeries.periods,
                    indicator, title: '', subtitle: '', notes: null,
                    showIntervals: true, pooledYears: analysis.periodSeries.years,
                    width, height: 240, standalone: false,
                  })
                }
                ariaLabel={`Change over time in ${selectedArea.name} compared with England`}
                className="[&_svg]:h-auto [&_svg]:w-full"
              />
            </FigureFrame>
          ) : (
            <UnsupportedState
              title="No time series for this selection"
              explanation="Fewer than two periods are published, so change over time cannot be shown."
            />
          )}
        </div>

        <aside className="space-y-3">
          <div className="panel p-4">
            <h3 className="text-sm font-semibold text-oxford-900">Interpretation</h3>
            <div className="mt-3">
              {evidence ? <EvidencePanel statement={evidence} /> : null}
            </div>
          </div>

          {comparison ? (
            <div className="panel p-4">
              <h3 className="text-sm font-semibold text-oxford-900">
                Magnitude and evidence are different things
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-700">
                The <strong>size</strong> of the difference from England is{' '}
                {Math.abs(comparison.absoluteDifference).toFixed(2)} {indicator.unit}.
                Whether there is <strong>evidence</strong> for a real difference is a
                separate question, answered by the publisher&rsquo;s significance flag
                {comparison.sourceSignificance === 'not-compared'
                  ? ', which is not supplied for this observation.'
                  : `, which records "${comparison.sourceSignificance}".`}
                {' '}A large difference with a wide interval and a small difference with a
                narrow interval are not the same finding.
              </p>
            </div>
          ) : null}

          <div className="panel p-4">
            <h3 className="text-sm font-semibold text-oxford-900">Evidence provenance</h3>
            <div className="mt-2.5">
              {evidence ? <ProvenanceList statement={evidence} /> : null}
            </div>
            {indicator.definition ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-brass-700">
                  Indicator definition
                </summary>
                <p className="mt-1.5 whitespace-pre-line text-2xs leading-relaxed text-slate-600">
                  {indicator.definition}
                </p>
              </details>
            ) : null}
            {indicator.methodology ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-brass-700">
                  Method as published
                </summary>
                <p className="mt-1.5 whitespace-pre-line text-2xs leading-relaxed text-slate-600">
                  {indicator.methodology}
                </p>
              </details>
            ) : null}
          </div>

          <div className="panel border-amber-200 bg-amber-50/50 p-4">
            <h3 className="text-sm font-semibold text-amber-950">
              What this cannot tell you
            </h3>
            <ul className="mt-2 list-outside list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-amber-950">
              <li>
                Why the figure differs. A descriptive rate carries no information about
                cause.
              </li>
              <li>
                Whether an intervention would change it. That needs evidence of effect,
                not evidence of variation.
              </li>
              <li>
                Anything about an individual in this area. This is an area-level measure.
              </li>
              <li>
                Whether the service is performing well or badly. Need, access,
                case-finding and coding all move these numbers.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
