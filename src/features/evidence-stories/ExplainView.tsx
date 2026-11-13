import { useCallback, useMemo, useState } from 'react';
import {
  ArrowRight, Share2, Check, Eye, Scale, MoveHorizontal, Unlink, Search, Sigma, TrendingUp,
  Ruler, XCircle, FileText, ChevronDown, Database,
} from 'lucide-react';
import { Reveal, CountUp } from '@/components/motion/motion';
import { FlowSteps, IconCards } from '@/components/infographics/infographics';
import { DifferenceTile, ChangeTile } from '@/features/atlas/AreaSnapshot';
import { IntervalVsEngland } from '@/features/atlas/IntervalVsEngland';
import { rankByValue, rankWindow } from '@/data/selectors/ranking';
import { seriesFor } from '@/data/loader';
import { displayDecimals, formatValue, unitLabel } from '@/data/selectors/format';
import { cn } from '@/lib/utils';
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
import { buildTrendLines } from '@/charts/trend-lines';
import { LoadingState, ErrorState, EmptyState, UnsupportedState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { isPresent } from '@/data/schemas/observation';
import { SELECTION } from '@/charts/palette';
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
  const [statementOpen, setStatementOpen] = useState(false);

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
    const ranked = rankByValue(analysis.observationsForPeriod);
    const window = rankWindow(ranked, selectedArea.code, 3) ?? ranked.slice(0, 7);
    return window.map((entry) => ({ observation: entry.observation, rank: entry.rank, total: ranked.length }));
  }, [analysis.observationsForPeriod, selectedArea]);
  const flagLevel = observations.flagLevel;
  const intervalLevel = flagLevel.basis === 'exact' && flagLevel.level ? flagLevel.level : 95;

  if (!selectedArea) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <Reveal as="header">
          <p className="label-caps">Explain a finding</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.015em] text-oxford-900">
            Turn one place into a statement you can defend
          </h2>
        </Reveal>
        <div className="mt-6">
          <FlowSteps
            nodes={[
              { icon: Eye, label: 'Observed', content: <p className="text-xs text-slate-600">The value, with its interval</p> },
              { icon: Scale, label: 'Compared', content: <p className="text-xs text-slate-600">Against England, size and evidence apart</p> },
              { icon: MoveHorizontal, label: 'Uncertain', content: <p className="text-xs text-slate-600">What the interval allows</p> },
              { icon: Unlink, label: 'Limits', content: <p className="text-xs text-slate-600">What it cannot tell you</p> },
            ]}
          />
        </div>
        <Reveal delay={500} className="mt-8 max-w-md rounded-xl border border-brass-300 bg-brass-50/60 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-oxford-900">
            <Search className="h-4 w-4 text-brass-600" aria-hidden />Pick a place to begin
          </p>
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
          <Button variant="link" className="mt-2 px-0" onClick={() => onChange({ mode: 'explore' })}>
            Or explore the map first
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </Reveal>
      </div>
    );
  }

  const evidence = analysis.evidence;
  const comparison = evidence?.comparisonDetail ?? null;

  const observed = analysis.selectedObservation;
  const benchmark = analysis.benchmarkObservation;
  const periodIndex = analysis.periodSeries.periods.indexOf(analysis.period);
  const step = analysis.periodSeries.pooled ? analysis.periodSeries.years : 1;
  const previousPeriod = periodIndex - step >= 0 ? analysis.periodSeries.periods[periodIndex - step] : null;
  const areaSeries = seriesFor(observations, selectedArea.code, analysis.sex);
  const flag = isPresent(observed) ? observed.significance : 'not-compared';

  return (
    <div className="shell py-4">
      <Reveal as="header" className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">Evidence statement</p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.015em] text-oxford-900">
            {evidence?.unavailable
              ? `${indicator.shortName} in ${selectedArea.name}: no value available`
              : `${indicator.shortName} in ${selectedArea.name}, ${analysis.period}`}
          </h2>
          <p className="mt-1 font-figure text-2xs text-slate-500">
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
      </Reveal>

      {/* The finding at a glance, in reading order. */}
      {isPresent(observed) ? (
        <section aria-label="The finding at a glance" className="mb-5">
          <FlowSteps
            nodes={[
              {
                icon: Eye,
                label: 'Observed',
                content: (
                  <div>
                    <CountUp
                      value={observed.value}
                      decimals={displayDecimals(observed.value, indicator)}
                      className="block text-3xl font-semibold leading-none text-oxford-900"
                    />
                    <p className="mt-1 font-figure text-2xs text-slate-500">{unitLabel(indicator)} · {analysis.period}</p>
                  </div>
                ),
              },
              {
                icon: Scale,
                label: 'vs England',
                content: comparison ? (
                  <DifferenceTile comparison={comparison} indicator={indicator} />
                ) : <p className="text-xs text-slate-500">No England value for this period</p>,
              },
              {
                icon: Sigma,
                label: 'Evidence',
                content: isPresent(benchmark) ? (
                  <IntervalVsEngland observation={observed} england={benchmark} indicator={indicator} flagLevel={flagLevel} />
                ) : <p className="text-xs text-slate-500">Not compared</p>,
              },
              {
                icon: TrendingUp,
                label: 'Over time',
                content: (
                  <ChangeTile
                    current={observed}
                    previous={previousPeriod ? areaSeries.get(previousPeriod) : undefined}
                    previousPeriod={previousPeriod}
                    indicator={indicator}
                  />
                ),
              },
            ]}
          />
        </section>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          <Reveal>
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
            caveats={[
              { kind: 'coverage', label: `${indicator.coverage.nations.join(' and ')} only` },
              { kind: 'not-causal', label: 'Pattern, not cause' },
            ]}
            limitation={
              analysis.viewModel.coverageNote ??
              'Area-level differences are descriptive. They do not identify a cause.'
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
            {evidence ? <p className="sr-only">{selectedArea.name} is outlined. {evidence.observed}</p> : null}
          </FigureFrame>
          </Reveal>

          {peers.length > 1 ? (
            <Reveal>
            <FigureFrame
              question={`Where does ${selectedArea.name} sit among its nearest neighbours in value?`}
              indicatorName={indicator.name}
              meta={{
                population: analysis.notes.population,
                period: analysis.notes.period,
                geography: selection.areaType.label,
                unit: indicator.unit ?? 'not stated',
                source: indicator.dataSource ?? 'Not stated',
              }}
              caveats={[
                { kind: 'interval', label: `Bars = ${intervalLevel}%${flagLevel.basis === 'exact' ? ', as the flag' : ''}` },
                { kind: 'rank', label: 'Position, not a league table' },
              ]}
              limitation="Neighbouring areas in this ordering are usually not distinguishable from one another once their confidence intervals are taken into account. This is a position in a distribution, not a league table. Solid dots are areas the publisher flags as different from England; hollow dots are flagged similar."
            >
              <InlineSvgChart
                render={(width) =>
                  renderDotWhiskerSvg({
                    rows: peers.map(({ observation, rank }) => ({
                      areaCode: observation.areaCode,
                      areaName: registry.get(observation.areaCode)?.name ?? observation.areaCode,
                      observation,
                      isSelected: observation.areaCode === selectedArea.code,
                      selectionIndex: observation.areaCode === selectedArea.code ? 0 : null,
                      rank,
                    })),
                    indicator,
                    benchmark: isPresent(benchmark) ? benchmark : null,
                    benchmarkLabel: 'England',
                    title: '', subtitle: '', notes: null,
                    width, standalone: false,
                    encodeSignificance: true, intervalLevel,
                    rankTotal: peers[0]?.total ?? null,
                  })
                }
                ariaLabel={`${selectedArea.name} compared with its nearest neighbours in value`}
                className="[&_svg]:h-auto [&_svg]:w-full"
              />
            </FigureFrame>
            </Reveal>
          ) : null}

          {analysis.periodSeries.periods.length >= 2 ? (
            <Reveal>
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
              caveats={[
                ...(analysis.periodSeries.pooled
                  ? [{ kind: 'pooled' as const, label: `${analysis.periodSeries.years}-year periods overlap` }]
                  : []),
                { kind: 'gaps', label: 'Gap = no value, not zero' },
              ]}
              limitation={
                analysis.periodSeries.pooled
                  ? `Rolling ${analysis.periodSeries.years}-year pooled periods overlap, so consecutive points are not independent.`
                  : 'Gaps in the line are periods with no published value.'
              }
            >
              <InlineSvgChart
                render={(width) =>
                  renderTimeSeriesSvg({
                    series: buildTrendLines({
                      observations,
                      sex: analysis.sex,
                      periods: analysis.periodSeries.periods,
                      areas: [{
                        code: selectedArea.code, label: selectedArea.name,
                        colour: SELECTION.stroke, showInterval: true,
                      }],
                      benchmark: { label: 'England', areaCode: 'E92000001', showInterval: true },
                    }),
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
            </Reveal>
          ) : (
            <UnsupportedState
              title="No time series for this selection"
              explanation="Fewer than two periods are published, so change over time cannot be shown."
            />
          )}
        </div>

        <aside className="space-y-3">
          {comparison ? (
            <Reveal className="panel p-4">
              <h3 className="text-sm font-semibold text-oxford-900">Two separate questions</h3>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <p className="flex items-center gap-1 label-caps text-[0.6rem]"><Ruler className="h-3 w-3" aria-hidden />How big?</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-oxford-900">
                    {formatValue(Math.abs(comparison.absoluteDifference), indicator)}
                  </p>
                  <p className="font-figure text-2xs text-slate-500">{unitLabel(indicator)} {comparison.direction === 'equal' ? 'apart' : comparison.direction}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <p className="flex items-center gap-1 label-caps text-[0.6rem]"><Sigma className="h-3 w-3" aria-hidden />Real?</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-oxford-900">
                    <FlagDot flag={flag} />
                    {flag === 'not-compared' ? 'Not compared' : flag === 'similar' ? 'Similar' : 'Different'}
                  </p>
                  <p className="font-figure text-2xs text-slate-500">publisher’s flag{flagLevel.basis === 'exact' && flagLevel.level ? `, ${flagLevel.level}%` : ''}</p>
                </div>
              </div>
              <p className="sr-only">
                The size of the difference from England and the evidence for a real difference
                are separate questions. A large difference with a wide interval and a small
                difference with a narrow interval are not the same finding.
              </p>
            </Reveal>
          ) : null}

          <Reveal className="panel border-amber-200 bg-amber-50/40 p-4" delay={80}>
            <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-amber-950">
              <Unlink className="h-4 w-4 text-amber-700" aria-hidden />What this cannot tell you
            </h3>
            <IconCards
              tone="amber"
              columns={1}
              icon={XCircle}
              items={[
                'Why the figure differs. A descriptive rate carries no information about cause.',
                'Whether an intervention would change it. That needs evidence of effect, not evidence of variation.',
                'Anything about an individual. This is an area-level measure.',
                'Whether the service is performing well or badly. Need, access, case-finding and coding all move these numbers.',
              ]}
            />
          </Reveal>

          <Reveal className="panel p-4" delay={120}>
            <button
              type="button"
              aria-expanded={statementOpen}
              onClick={() => setStatementOpen((open) => !open)}
              className="flex w-full items-center gap-1.5 rounded text-sm font-semibold text-oxford-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700"
            >
              <FileText className="h-4 w-4 text-brass-600" aria-hidden />
              Full written statement
              <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', statementOpen && 'rotate-180')} aria-hidden />
            </button>
            <div className={statementOpen ? 'mt-3' : 'sr-only'}>
              {evidence ? <EvidencePanel statement={evidence} /> : null}
            </div>
          </Reveal>

          <Reveal className="panel p-4" delay={160}>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-oxford-900">
              <Database className="h-4 w-4 text-oxford-500" aria-hidden />Provenance
            </h3>
            {evidence ? (
              <div className="mt-2 flex flex-wrap gap-1.5 font-figure text-2xs">
                {[
                  `ID ${evidence.provenance.indicatorId}`,
                  evidence.provenance.source,
                  evidence.provenance.licence,
                  `Retrieved ${evidence.provenance.retrievedAt.slice(0, 10)}`,
                ].map((chip) => (
                  <span key={chip} title={chip} className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">{chip}</span>
                ))}
              </div>
            ) : null}
            <details className="mt-2.5">
              <summary className="cursor-pointer text-xs font-medium text-brass-700">All provenance fields</summary>
              <div className="mt-2">{evidence ? <ProvenanceList statement={evidence} /> : null}</div>
            </details>
            {indicator.definition ? (
              <details className="mt-2">
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
          </Reveal>
        </aside>
      </div>
    </div>
  );
}

function FlagDot({ flag }: { flag: string }) {
  if (flag === 'not-compared') {
    return <span aria-hidden className="inline-block h-3 w-0.5 bg-oxford-800" />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-3 w-3 rounded-full border-2 border-oxford-800',
        flag === 'similar' ? 'bg-white' : 'bg-oxford-800',
      )}
    />
  );
}
