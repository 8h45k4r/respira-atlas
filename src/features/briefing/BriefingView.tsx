import { useCallback, useMemo, useState } from 'react';
import {
  Printer, FileCode, Image, FileJson, FileSpreadsheet, Lock, PenLine, TrendingUp, MapPinned,
  Eye, Scale, MoveHorizontal, TriangleAlert, Search,
} from 'lucide-react';
import { Reveal } from '@/components/motion/motion';
import { DifferenceTile } from '@/features/atlas/AreaSnapshot';
import { IntervalVsEngland } from '@/features/atlas/IntervalVsEngland';
import { formatValue, unitLabel } from '@/data/selectors/format';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import { stateToUrl } from '@/state/atlas-state';
import { useGeographyLayer } from '@/hooks/useGeographyLayer';
import { useObservations } from '@/hooks/useObservations';
import { resolveSelection, useAnalysis } from '@/features/atlas/useAnalysis';
import { renderMapSvg } from '@/export/map-svg';
import { renderDotWhiskerSvg, renderTimeSeriesSvg } from '@/export/chart-svg';
import { buildTrendLines } from '@/charts/trend-lines';
import { buildFigureSpec, TEXT_SCALES, mandatoryNoteLines, type FigureComposition } from '@/export/figure-spec';
import {
  downloadSvg, downloadPng, downloadCsv, downloadJson, buildFilteredCsv, ExportError,
} from '@/export/download';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { Label, Badge } from '@/components/ui/misc';
import { isPresent } from '@/data/schemas/observation';
import { rankByValue, rankWindow, rankExtremes } from '@/data/selectors/ranking';
import { SELECTION } from '@/charts/palette';
import { cn, slug } from '@/lib/utils';
import { ConceptualDiagrams } from './ConceptualDiagrams';

type Layout = 'map' | 'chart' | 'map-and-chart' | 'brief' | 'slide' | 'diagram';

const LAYOUTS: { value: Layout; label: string; hint: string }[] = [
  { value: 'map', label: 'Single map', hint: 'One choropleth with notes' },
  { value: 'chart', label: 'Single chart', hint: 'Comparison or trend' },
  { value: 'map-and-chart', label: 'Map and comparison chart', hint: 'Two panels' },
  { value: 'brief', label: 'One-page evidence brief', hint: 'A4, print-ready' },
  { value: 'slide', label: 'Presentation slide', hint: '1280 × 720' },
  { value: 'diagram', label: 'Teaching figure or diagram', hint: 'Editable conceptual SVG' },
];

/** "Prepare a briefing": a publication composer over the current selection. */
export function BriefingView({
  catalogue, state, onChange,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  onChange: (patch: Partial<AtlasState>) => void;
}) {
  const { resolved } = useMemo(() => resolveSelection(catalogue, state), [catalogue, state]);
  const layer = useGeographyLayer(resolved?.areaType ?? null);
  const observations = useObservations(resolved?.availability ?? null);

  if (!resolved) {
    return <EmptyState title="Nothing to compose" explanation="No indicator is available for this geography mode." />;
  }
  if (!layer || layer.status === 'loading' || !observations || observations.status === 'loading') {
    return <LoadingState label="Loading the figure data…" />;
  }
  if (layer.status === 'error') {
    return <ErrorState title="Boundaries could not be loaded" error={layer.error} onRetry={layer.retry} />;
  }
  if (observations.status === 'error') {
    return <ErrorState title="Observations could not be loaded" error={observations.error} onRetry={observations.retry} />;
  }

  return (
    <BriefingBody
      catalogue={catalogue} state={state} onChange={onChange}
      selection={resolved} registry={layer.value} observations={observations.value}
    />
  );
}

function BriefingBody({
  catalogue, state, onChange, selection, registry, observations,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  onChange: (patch: Partial<AtlasState>) => void;
  selection: NonNullable<ReturnType<typeof resolveSelection>['resolved']>;
  registry: import('@/geography/model').AreaRegistry;
  observations: import('@/data/loader').ObservationSet;
}) {
  const analysis = useAnalysis({ catalogue, state, selection, registry, observations });
  const [layout, setLayout] = useState<Layout>('brief');
  const [textScale, setTextScale] = useState<keyof typeof TEXT_SCALES>('standard');
  const [headline, setHeadline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { indicator } = selection;
  const selectedArea = state.selectedAreaCode ? registry.get(state.selectedAreaCode) : undefined;

  const composition: FigureComposition =
    layout === 'slide' ? 'presentation' : layout === 'brief' ? 'a4-brief' : 'figure';

  const evidenceSentence = useMemo(() => {
    if (!analysis.evidence || analysis.evidence.unavailable) return null;
    return [analysis.evidence.observed, analysis.evidence.comparison].filter(Boolean).join(' ');
  }, [analysis.evidence]);

  const mapSvg = useMemo(
    () =>
      renderMapSvg({
        viewModel: analysis.viewModel, notes: analysis.notes, composition, textScale,
        headline: headline.trim() === '' ? null : headline.trim(),
        headlineIsUserAuthored: headline.trim() !== '',
        evidenceSentence,
      }),
    [analysis.viewModel, analysis.notes, composition, textScale, headline, evidenceSentence],
  );

  const comparisonRows = useMemo(() => {
    const present = analysis.observationsForPeriod.filter(isPresent);
    const codes = [
      ...(state.selectedAreaCode ? [state.selectedAreaCode] : []),
      ...state.comparisonAreaCodes,
    ];
    const picked = codes.length > 0
      ? present.filter((o) => codes.includes(o.areaCode))
      : [...present].sort((a, b) => b.value - a.value).slice(0, 12);
    return picked.map((observation, index) => ({
      areaCode: observation.areaCode,
      areaName: registry.get(observation.areaCode)?.name ?? observation.areaCode,
      observation,
      isSelected: observation.areaCode === state.selectedAreaCode,
      selectionIndex: codes.length > 0 ? index : null,
    }));
  }, [analysis.observationsForPeriod, state.selectedAreaCode, state.comparisonAreaCodes, registry]);

  const chartSvg = useMemo(
    () =>
      renderDotWhiskerSvg({
        rows: comparisonRows, indicator,
        benchmark: isPresent(analysis.benchmarkObservation) ? analysis.benchmarkObservation : null,
        benchmarkLabel: 'England',
        title: headline.trim() || analysis.question,
        subtitle: analysis.viewModel.subtitle,
        notes: analysis.notes, textScale, width: 900,
      }),
    [comparisonRows, indicator, analysis, headline, textScale],
  );

  // The A4 brief prints the mandatory notes once, in its footer, so the figures
  // embedded in it are drawn without their own copies. Downloads keep theirs.
  const briefMapSvg = useMemo(
    () =>
      renderMapSvg({
        viewModel: analysis.viewModel, notes: analysis.notes, composition: 'plot-only',
        textScale: 'compact', headline: null, headlineIsUserAuthored: false,
      }),
    [analysis.viewModel, analysis.notes],
  );
  const briefChartSvg = useMemo(() => {
    const ranked = rankByValue(analysis.observationsForPeriod);
    const window = state.selectedAreaCode
      ? rankWindow(ranked, state.selectedAreaCode, 4) ?? rankExtremes(ranked, 4)
      : rankExtremes(ranked, 5);
    const { flagLevel } = observations;
    return renderDotWhiskerSvg({
      rows: window.map((entry) => ({
        areaCode: entry.observation.areaCode,
        areaName: registry.get(entry.observation.areaCode)?.name ?? entry.observation.areaCode,
        observation: entry.observation,
        isSelected: entry.observation.areaCode === state.selectedAreaCode,
        selectionIndex: entry.observation.areaCode === state.selectedAreaCode ? 0 : null,
        rank: entry.rank,
      })),
      indicator,
      benchmark: isPresent(analysis.benchmarkObservation) ? analysis.benchmarkObservation : null,
      benchmarkLabel: 'England',
      title: selectedArea
        ? `Where does ${selectedArea.name} sit among its nearest neighbours in value?`
        : `Where is ${indicator.shortName.toLowerCase()} highest and lowest?`,
      subtitle: analysis.viewModel.subtitle,
      notes: null, textScale: 'compact', width: 900,
      encodeSignificance: true, rankTotal: ranked.length,
      intervalLevel: flagLevel.basis === 'exact' && flagLevel.level ? flagLevel.level : 95,
    });
  }, [analysis, observations, registry, state.selectedAreaCode, selectedArea, indicator]);

  const trendSvg = useMemo(
    () =>
      renderTimeSeriesSvg({
        series: buildTrendLines({
          observations,
          sex: analysis.sex,
          periods: analysis.periodSeries.periods,
          areas: selectedArea
            ? [{
                code: selectedArea.code, label: selectedArea.name,
                colour: SELECTION.stroke, showInterval: true,
              }]
            : [],
          benchmark: { label: 'England', areaCode: 'E92000001', showInterval: true },
        }),
        periods: analysis.periodSeries.periods,
        indicator,
        title: headline.trim() || `How has ${indicator.shortName.toLowerCase()} changed?`,
        subtitle: analysis.viewModel.subtitle,
        notes: analysis.notes, showIntervals: true,
        pooledYears: analysis.periodSeries.years, textScale, width: 900, height: 320,
      }),
    [analysis, observations, selectedArea, indicator, headline, textScale],
  );

  const basename = `${slug(indicator.shortName)}-${slug(selection.areaType.key)}-${slug(analysis.period)}`;

  const spec = useMemo(
    () =>
      buildFigureSpec({
        composition, textScale,
        headline: headline.trim() === '' ? null : headline.trim(),
        question: analysis.question,
        state: { ...state, period: analysis.period },
        shareUrl: stateToUrl({ ...state, period: analysis.period }),
        notes: analysis.notes,
        classification: analysis.viewModel.classification,
        evidence: analysis.evidence,
        viewModel: analysis.viewModel,
      }),
    [composition, textScale, headline, analysis, state],
  );

  const run = useCallback(async (action: () => void | Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof ExportError
          ? caught.message
          : `The export failed: ${caught instanceof Error ? caught.message : String(caught)}`,
      );
    }
  }, []);

  const primarySvg = layout === 'chart' ? chartSvg : mapSvg;

  return (
    <div className="shell py-4">
      <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="space-y-3.5 no-print">
          <Reveal as="header">
            <p className="label-caps">Publication composer</p>
            <h2 className="mt-1 text-lg font-semibold leading-tight text-oxford-900">
              Prepare a briefing
            </h2>
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-brass-200 bg-brass-50 px-2 py-0.5 font-figure text-2xs text-brass-800">
              <Lock className="h-3 w-3" aria-hidden />Source, method and limitation notes are always attached
            </span>
          </Reveal>

          <fieldset>
            <legend className="label-caps mb-1.5">Layout</legend>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Layout">
              {LAYOUTS.map((option, index) => (
                <Reveal key={option.value} delay={index * 50}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={layout === option.value}
                    title={`${option.label}: ${option.hint}`}
                    onClick={() => setLayout(option.value)}
                    className={cn(
                      'flex w-full flex-col items-center gap-1 rounded-lg border p-1.5 transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700',
                      layout === option.value
                        ? 'border-brass-500 bg-brass-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-oxford-300',
                    )}
                  >
                    <LayoutThumb layout={option.value} active={layout === option.value} />
                    <span className="text-center font-figure text-[0.62rem] leading-tight text-slate-700">{option.label}</span>
                  </button>
                </Reveal>
              ))}
            </div>
          </fieldset>

          {layout !== 'diagram' ? (
            <>
              <fieldset>
                <legend className="label-caps mb-1.5">Text size</legend>
                <div className="inline-flex rounded-lg border border-slate-300 p-0.5" role="radiogroup" aria-label="Text size">
                  {(['compact', 'standard', 'large'] as const).map((size, index) => (
                    <button
                      key={size}
                      type="button"
                      role="radio"
                      aria-checked={textScale === size}
                      aria-label={size}
                      onClick={() => setTextScale(size)}
                      className={cn(
                        'flex h-8 w-11 items-center justify-center rounded-md font-semibold transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700',
                        textScale === size ? 'bg-oxford-800 text-white' : 'text-slate-600 hover:bg-slate-100',
                      )}
                    >
                      <span style={{ fontSize: `${11 + index * 3}px` }}>A</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <Label htmlFor="brief-headline">Headline (optional)</Label>
                <textarea
                  id="brief-headline"
                  rows={2}
                  maxLength={180}
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder="Leave blank to use the analytical question"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brass-700"
                />
                {headline.trim() !== '' ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-figure text-2xs text-amber-900">
                    <PenLine className="h-3 w-3" aria-hidden />Marked as user-authored
                  </span>
                ) : null}
              </div>

              <fieldset className="rule pt-3">
                <legend className="label-caps mb-1.5 pt-3">Download</legend>
                <button
                  type="button"
                  onClick={() => run(() => downloadSvg(primarySvg, `${basename}-${layout}`))}
                  className="flex w-full items-center gap-2 rounded-lg bg-brass-600 px-3 py-2.5 text-left text-white shadow-sm transition hover:bg-brass-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700"
                >
                  <FileCode className="h-5 w-5 shrink-0" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold">Download SVG (vector)</span>
                    <span className="block font-figure text-2xs opacity-85">Editable, sharp at any size</span>
                  </span>
                </button>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <DownloadTile icon={Image} label="Download PNG (3×)" sub="Slides, email"
                    onClick={() => run(() => downloadPng(primarySvg, `${basename}-${layout}`, { scale: 3 }))} />
                  <DownloadTile icon={FileSpreadsheet} label="Download CSV" sub="Every area, with availability"
                    onClick={() =>
                      run(() =>
                        downloadCsv(
                          buildFilteredCsv(analysis.viewModel, indicator, analysis.notes, analysis.period),
                          basename,
                        ),
                      )
                    } />
                  <DownloadTile icon={TrendingUp} label="Download trend chart SVG" sub="Area vs England"
                    onClick={() => run(() => downloadSvg(trendSvg, `${basename}-trend`))} />
                  {layout === 'map-and-chart' ? (
                    <DownloadTile icon={FileCode} label="Download comparison chart SVG" sub="Second panel"
                      onClick={() => run(() => downloadSvg(chartSvg, `${basename}-comparison`))} />
                  ) : null}
                  <DownloadTile icon={FileJson} label="Download figure specification" sub="Reproduce exactly"
                    onClick={() => run(() => downloadJson(spec, `${basename}-figure-spec`))} />
                  {layout === 'brief' ? (
                    <DownloadTile icon={Printer} label="Print / Save as PDF" sub="A4"
                      onClick={() => window.print()} />
                  ) : null}
                </div>
              </fieldset>
            </>
          ) : null}

          {error ? (
            <p className="border border-destructive/30 bg-destructive/5 p-2 text-2xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {!selectedArea && layout === 'brief' ? (
            <button
              type="button"
              onClick={() => onChange({ mode: 'explore' })}
              className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-left text-2xs text-amber-900 hover:border-amber-400"
            >
              <MapPinned className="h-4 w-4 shrink-0" aria-hidden />
              <span><span className="font-semibold">No place selected:</span> the brief covers the whole distribution. Select a place</span>
            </button>
          ) : null}
        </div>

        <div className="min-w-0">
          {layout === 'diagram' ? (
            <ConceptualDiagrams indicator={indicator} />
          ) : layout === 'brief' ? (
            <PrintBrief
              analysis={analysis}
              flagLevel={observations.flagLevel}
              mapSvg={briefMapSvg}
              chartSvg={briefChartSvg}
              headline={headline.trim()}
              indicator={indicator}
              areaName={selectedArea?.name ?? null}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 no-print">
                <h3 className="label-caps">Preview — this is the exported file</h3>
                <Badge tone="neutral">
                  {layout === 'slide' ? '1280 × 720' : 'scaled to fit'}
                </Badge>
              </div>
              <div
                className="overflow-auto border border-slate-200 bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: primarySvg }}
              />
              {layout === 'map-and-chart' ? (
                <div
                  className="overflow-auto border border-slate-200 bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: chartSvg }}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A4 evidence brief. Styled for print; the screen shows the same thing. */
function PrintBrief({
  analysis, mapSvg, chartSvg, headline, indicator, areaName, flagLevel,
}: {
  analysis: ReturnType<typeof useAnalysis>;
  mapSvg: string;
  chartSvg: string;
  headline: string;
  indicator: import('@/data/schemas/manifest').Indicator;
  areaName: string | null;
  flagLevel: import('@/data/selectors/flag-level').FlagLevel;
}) {
  const evidence = analysis.evidence;
  const observed = analysis.selectedObservation;
  const benchmark = analysis.benchmarkObservation;
  const comparison = evidence?.comparisonDetail ?? null;
  return (
    <article className="mx-auto max-w-[794px] border border-slate-300 bg-white p-8 print:border-0 print:p-0">
      <header className="border-b-2 border-oxford-800 pb-2">
        <p className="label-caps">Evidence brief</p>
        <h1 className="mt-1 text-xl font-semibold leading-tight tracking-[-0.015em] text-oxford-900">
          {headline || analysis.question}
        </h1>
        {headline ? (
          <p className="mt-1 text-2xs text-slate-500">
            Headline written by the user of this atlas, not by the data publisher.
          </p>
        ) : null}
        <p className="mt-1.5 font-figure text-xs text-slate-600">
          {indicator.name} — {analysis.notes.geography}, {analysis.notes.period}
          {areaName ? ` · focus: ${areaName}` : ''}
        </p>
      </header>

      {/* Key figures: the finding before the reading. */}
      {isPresent(observed) ? (
        <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-3 rounded-lg bg-oxford-50 p-3 print:bg-transparent print:p-0">
          <div>
            <p className="label-caps text-[0.6rem]">{areaName ?? 'Selected area'}</p>
            <p className="text-3xl font-semibold tabular-nums leading-none text-oxford-900">
              {formatValue(observed.value, indicator)}
            </p>
            <p className="mt-0.5 font-figure text-2xs text-slate-500">{unitLabel(indicator)}</p>
          </div>
          {comparison ? <DifferenceTile comparison={comparison} indicator={indicator} /> : <span />}
          {isPresent(benchmark) ? (
            <div className="rounded-md border border-slate-200 bg-white px-2 py-1">
              <IntervalVsEngland observation={observed} england={benchmark} indicator={indicator} flagLevel={flagLevel} />
            </div>
          ) : <span />}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {([
            ['With a value', analysis.viewModel.counts.withValue],
            ['No value', analysis.viewModel.counts.missing],
            ['Suppressed', analysis.viewModel.counts.suppressed],
            ['Outside coverage', analysis.viewModel.counts.outsideCoverage],
          ] as const).map(([label, count]) => (
            <div key={label} className="rounded-md border border-slate-200 px-2 py-1.5">
              <p className="text-xl font-semibold tabular-nums text-oxford-900">{count}</p>
              <p className="font-figure text-2xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div
          className="[&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: mapSvg }}
        />
        <div className="space-y-3">
          {evidence ? (
            <>
              <section>
                <h2 className="label-caps flex items-center gap-1"><Eye className="h-3 w-3 text-brass-600" aria-hidden />What was observed</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-800">{evidence.observed}</p>
              </section>
              {evidence.comparison ? (
                <section>
                  <h2 className="label-caps flex items-center gap-1"><Scale className="h-3 w-3 text-brass-600" aria-hidden />How it compares</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-800">{evidence.comparison}</p>
                </section>
              ) : null}
              <section>
                <h2 className="label-caps flex items-center gap-1"><MoveHorizontal className="h-3 w-3 text-brass-600" aria-hidden />Uncertainty</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-800">{evidence.uncertainty}</p>
              </section>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-slate-700">
              No single place is selected. This brief describes the distribution across{' '}
              {analysis.viewModel.counts.withValue} areas with a published value.
            </p>
          )}
        </div>
      </div>

      <div
        className="mt-4 [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: chartSvg }}
      />

      {evidence ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section>
            <h2 className="label-caps flex items-center gap-1"><TriangleAlert className="h-3 w-3 text-brass-600" aria-hidden />Limitations</h2>
            <ul className="mt-1 list-outside list-disc space-y-1 pl-4 text-2xs leading-relaxed text-slate-700">
              {evidence.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
            </ul>
          </section>
          <section>
            <h2 className="label-caps flex items-center gap-1"><Search className="h-3 w-3 text-brass-600" aria-hidden />Questions for further investigation</h2>
            <ul className="mt-1 list-outside list-disc space-y-1 pl-4 text-2xs leading-relaxed text-slate-700">
              {evidence.furtherEvidence.map((question) => <li key={question}>{question}</li>)}
            </ul>
          </section>
        </div>
      ) : null}

      <footer className="mt-5 border-t border-slate-300 pt-2">
        <ul className="space-y-0.5 font-figure text-[9px] leading-snug text-slate-600">
          {mandatoryNoteLines(analysis.notes).map((note) => <li key={note}>{note}</li>)}
          <li>
            Produced with the Public Health Evidence Atlas, an independent research
            tool. It carries no endorsement from the NHS, OHID, the ONS, or the
            institutions its contributors are affiliated with.
          </li>
        </ul>
      </footer>
    </article>
  );
}

/** A miniature of each layout, so the choice is made by looking. */
function LayoutThumb({ layout, active }: { layout: Layout; active: boolean }) {
  const ink = active ? '#002147' : '#6a8cb8';
  const soft = active ? '#c3d3e6' : '#e2eaf3';
  const brass = '#a9791f';
  const page = (children: React.ReactNode, w = 30, h = 40) => (
    <svg viewBox="0 0 48 40" className="h-9 w-12" aria-hidden>
      <rect x={(48 - w) / 2} y={(40 - h) / 2} width={w} height={h} rx="2" fill="#fff" stroke={soft} />
      {children}
    </svg>
  );
  switch (layout) {
    case 'map':
      return page(<path d="M20 9 l6 -2 l4 6 l-2 8 l3 6 l-6 6 l-7 -3 l2 -9 z" fill={ink} />);
    case 'chart':
      return page(<g stroke={ink} strokeWidth="1.5">{[12, 18, 24, 30].map((y, i) => (
        <g key={y}><line x1={16 + i} y1={y} x2={28 + i} y2={y} /><circle cx={22 + i} cy={y} r="1.6" fill={i === 1 ? brass : ink} /></g>
      ))}</g>);
    case 'map-and-chart':
      return (
        <svg viewBox="0 0 48 40" className="h-9 w-12" aria-hidden>
          <rect x="3" y="6" width="42" height="28" rx="2" fill="#fff" stroke={soft} />
          <path d="M9 11 l4 -1 l3 4 l-1 6 l2 4 l-4 4 l-5 -2 l1 -7 z" fill={ink} />
          <g stroke={ink} strokeWidth="1.2">{[13, 19, 25].map((y) => <line key={y} x1="27" y1={y} x2="40" y2={y} />)}</g>
        </svg>
      );
    case 'brief':
      return page(
        <g>
          <rect x="13" y="4" width="22" height="3" fill={ink} />
          <rect x="13" y="10" width="10" height="12" fill={soft} />
          <path d="M15 12 l3 -1 l2 3 l-1 4 l-3 2 z" fill={ink} />
          <g stroke={soft} strokeWidth="1.2">{[11, 14, 17, 20].map((y) => <line key={y} x1="25" y1={y} x2="35" y2={y} />)}</g>
          <polyline points="13,32 18,28 23,30 28,25 35,27" fill="none" stroke={brass} strokeWidth="1.4" />
        </g>,
        26, 38,
      );
    case 'slide':
      return (
        <svg viewBox="0 0 48 40" className="h-9 w-12" aria-hidden>
          <rect x="2" y="9" width="44" height="25" rx="2" fill="#fff" stroke={soft} />
          <rect x="6" y="12" width="18" height="3" fill={ink} />
          <path d="M30 13 l4 -1 l3 4 l-1 6 l2 4 l-4 4 l-5 -2 l1 -7 z" fill={ink} />
          <g stroke={soft} strokeWidth="1.2">{[19, 23, 27].map((y) => <line key={y} x1="6" y1={y} x2="22" y2={y} />)}</g>
        </svg>
      );
    case 'diagram':
      return page(
        <g stroke={ink} strokeWidth="1.2" fill="#fff">
          <rect x="15" y="8" width="18" height="7" rx="2" />
          <rect x="15" y="25" width="18" height="7" rx="2" />
          <line x1="24" y1="15" x2="24" y2="25" stroke={brass} />
        </g>,
      );
    default:
      return null;
  }
}

function DownloadTile({ icon: Icon, label, sub, onClick }: {
  icon: typeof FileCode; label: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-lg border border-slate-200 bg-white p-2 text-left transition
                 hover:-translate-y-0.5 hover:border-brass-400 hover:shadow-sm
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700"
    >
      <Icon className="h-4 w-4 text-oxford-600" aria-hidden />
      <span className="text-2xs font-semibold leading-tight text-oxford-900">{label}</span>
      <span className="font-figure text-[0.6rem] leading-tight text-slate-500">{sub}</span>
    </button>
  );
}
