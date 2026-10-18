import { useCallback, useMemo, useState } from 'react';
import { Printer, FileCode, Image, FileJson, FileSpreadsheet } from 'lucide-react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import { stateToUrl } from '@/state/atlas-state';
import { useGeographyLayer } from '@/hooks/useGeographyLayer';
import { useObservations } from '@/hooks/useObservations';
import { resolveSelection, useAnalysis } from '@/features/atlas/useAnalysis';
import { renderMapSvg } from '@/export/map-svg';
import { renderDotWhiskerSvg, renderTimeSeriesSvg } from '@/export/chart-svg';
import { buildFigureSpec, TEXT_SCALES, mandatoryNoteLines, type FigureComposition } from '@/export/figure-spec';
import {
  downloadSvg, downloadPng, downloadCsv, downloadJson, buildFilteredCsv, ExportError,
} from '@/export/download';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Label, Badge } from '@/components/ui/misc';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { isPresent } from '@/data/schemas/observation';
import { CHART_INK, SELECTION } from '@/charts/palette';
import { slug } from '@/lib/utils';
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

  const trendSvg = useMemo(
    () =>
      renderTimeSeriesSvg({
        series: [
          ...(selectedArea
            ? [{
                label: selectedArea.name,
                colour: SELECTION.stroke,
                points: analysis.periodSeries.periods.map((period) => ({
                  period,
                  observation:
                    observations.byArea.get(selectedArea.code)?.get(period) ??
                    ({
                      areaCode: selectedArea.code, period, sex: observations.sex,
                      age: observations.age, categoryType: null, category: null,
                      state: 'missing' as const, significance: 'not-compared' as const,
                      trend: 'not-available' as const, note: null,
                    }),
                })),
              }]
            : []),
          {
            label: 'England',
            colour: CHART_INK.benchmark,
            dashed: true,
            points: analysis.periodSeries.periods.map((period) => ({
              period,
              observation:
                observations.benchmarkByPeriod.get(period) ??
                ({
                  areaCode: 'E92000001', period, sex: observations.sex, age: observations.age,
                  categoryType: null, category: null, state: 'missing' as const,
                  significance: 'not-compared' as const, trend: 'not-available' as const,
                  note: null,
                }),
            })),
          },
        ],
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
    <div className="mx-auto w-full max-w-[90rem] px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="space-y-3.5 no-print">
          <div>
            <p className="label-caps">Publication composer</p>
            <h2 className="mt-1 text-lg font-semibold leading-tight text-navy-900">
              Prepare a briefing
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Figures carry the source, method, period, benchmark, classification and
              limitation notes. Those notes cannot be removed.
            </p>
          </div>

          <div>
            <Label htmlFor="layout">Layout</Label>
            <Select value={layout} onValueChange={(value) => setLayout(value as Layout)}>
              <SelectTrigger id="layout" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LAYOUTS.map((option) => (
                  <SelectItem key={option.value} value={option.value} hint={option.hint}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {layout !== 'diagram' ? (
            <>
              <div>
                <Label htmlFor="brief-text-scale">Text size</Label>
                <Select
                  value={textScale}
                  onValueChange={(value) => setTextScale(value as keyof typeof TEXT_SCALES)}
                >
                  <SelectTrigger id="brief-text-scale" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                             focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
                {headline.trim() !== '' ? (
                  <p className="mt-1 text-2xs text-amber-800">
                    Labelled on the figure as user-authored.
                  </p>
                ) : null}
              </div>

              <div className="rule space-y-2 pt-3">
                <Button
                  variant="teal" className="w-full"
                  onClick={() => run(() => downloadSvg(primarySvg, `${basename}-${layout}`))}
                >
                  <FileCode className="h-3.5 w-3.5" aria-hidden />
                  Download SVG (vector)
                </Button>
                <Button
                  variant="outline" className="w-full"
                  onClick={() => run(() => downloadPng(primarySvg, `${basename}-${layout}`, { scale: 3 }))}
                >
                  <Image className="h-3.5 w-3.5" aria-hidden />
                  Download PNG (3×)
                </Button>
                {layout === 'map-and-chart' ? (
                  <Button
                    variant="outline" className="w-full"
                    onClick={() => run(() => downloadSvg(chartSvg, `${basename}-comparison`))}
                  >
                    <FileCode className="h-3.5 w-3.5" aria-hidden />
                    Download comparison chart SVG
                  </Button>
                ) : null}
                <Button
                  variant="outline" className="w-full"
                  onClick={() => run(() => downloadSvg(trendSvg, `${basename}-trend`))}
                >
                  <FileCode className="h-3.5 w-3.5" aria-hidden />
                  Download trend chart SVG
                </Button>
                <Button
                  variant="outline" className="w-full"
                  onClick={() =>
                    run(() =>
                      downloadCsv(
                        buildFilteredCsv(analysis.viewModel, indicator, analysis.notes, analysis.period),
                        basename,
                      ),
                    )
                  }
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
                  Download CSV
                </Button>
                <Button
                  variant="outline" className="w-full"
                  onClick={() => run(() => downloadJson(spec, `${basename}-figure-spec`))}
                >
                  <FileJson className="h-3.5 w-3.5" aria-hidden />
                  Download figure specification
                </Button>
                {layout === 'brief' ? (
                  <Button variant="subtle" className="w-full" onClick={() => window.print()}>
                    <Printer className="h-3.5 w-3.5" aria-hidden />
                    Print / Save as PDF
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}

          {error ? (
            <p className="border border-destructive/30 bg-destructive/5 p-2 text-2xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {!selectedArea && layout === 'brief' ? (
            <p className="border border-amber-200 bg-amber-50 p-2 text-2xs leading-relaxed text-amber-900">
              No place is selected, so the brief covers the whole distribution rather
              than one area.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => onChange({ mode: 'explore' })}
              >
                Select a place
              </button>
              .
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          {layout === 'diagram' ? (
            <ConceptualDiagrams indicator={indicator} />
          ) : layout === 'brief' ? (
            <PrintBrief
              analysis={analysis}
              mapSvg={mapSvg}
              chartSvg={chartSvg}
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
  analysis, mapSvg, chartSvg, headline, indicator, areaName,
}: {
  analysis: ReturnType<typeof useAnalysis>;
  mapSvg: string;
  chartSvg: string;
  headline: string;
  indicator: import('@/data/schemas/manifest').Indicator;
  areaName: string | null;
}) {
  const evidence = analysis.evidence;
  return (
    <article className="mx-auto max-w-[794px] border border-slate-300 bg-white p-8 print:border-0 print:p-0">
      <header className="border-b-2 border-navy-800 pb-2">
        <p className="label-caps">Evidence brief</p>
        <h1 className="mt-1 text-xl font-semibold leading-tight tracking-[-0.015em] text-navy-900">
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div
          className="[&_svg]:h-auto [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: mapSvg }}
        />
        <div className="space-y-3">
          {evidence ? (
            <>
              <section>
                <h2 className="label-caps">What was observed</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-800">{evidence.observed}</p>
              </section>
              {evidence.comparison ? (
                <section>
                  <h2 className="label-caps">How it compares</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-800">{evidence.comparison}</p>
                </section>
              ) : null}
              <section>
                <h2 className="label-caps">Uncertainty</h2>
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
            <h2 className="label-caps">Limitations</h2>
            <ul className="mt-1 list-outside list-disc space-y-1 pl-4 text-2xs leading-relaxed text-slate-700">
              {evidence.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
            </ul>
          </section>
          <section>
            <h2 className="label-caps">Questions for further investigation</h2>
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
            This brief is not affiliated with, and carries no endorsement from, the NHS,
            OHID, or any university.
          </li>
        </ul>
      </footer>
    </article>
  );
}
