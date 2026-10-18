import { useCallback, useMemo } from 'react';
import type { StoryFigure as FigureSpec, StoryContext } from './types';
import { InlineSvgChart } from '@/charts/InlineSvgChart';
import { renderMapSvg } from '@/export/map-svg';
import { renderDotWhiskerSvg, renderScatterSvg } from '@/export/chart-svg';
import { buildMapViewModel } from '@/charts/map-view-model';
import { classify } from '@/data/selectors/classification';
import { isPresent } from '@/data/schemas/observation';
import { measureTypeLabel } from '@/data/selectors/format';
import type { MandatoryNotes } from '@/export/figure-spec';
import { downloadSvg } from '@/export/download';
import { slug } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FileCode } from 'lucide-react';
import { UnsupportedState } from '@/components/common/states';
import { pairAreas } from './computations';

/**
 * Renders a story figure from the same renderers the rest of the atlas uses, so
 * a figure in a story and the same figure in the workspace are the same object.
 * Each one exports to genuine vector SVG carrying its own mandatory notes.
 */
export function StoryFigure({
  figure, context,
}: {
  figure: FigureSpec;
  context: StoryContext;
}) {
  const built = useMemo(() => buildFigure(figure, context), [figure, context]);

  const render = useCallback(
    (width: number) => (built ? built.render(width, false) : ''),
    [built],
  );

  if (!built) {
    return (
      <UnsupportedState
        title="This figure cannot be drawn"
        explanation="The data this figure needs are not available in the current release."
      />
    );
  }

  return (
    <figure className="panel mt-3">
      <div className="p-1 [&_svg]:h-auto [&_svg]:w-full">
        <InlineSvgChart
          render={render}
          ariaLabel={built.ariaLabel}
          minWidth={340}
        />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
        <p className="flex-1 font-figure text-2xs leading-relaxed text-slate-600">
          {figure.caption}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="no-print"
          onClick={() => downloadSvg(built.render(900, true), built.filename)}
        >
          <FileCode className="h-3.5 w-3.5" aria-hidden />
          SVG
        </Button>
      </figcaption>
    </figure>
  );
}

interface BuiltFigure {
  render: (width: number, standalone: boolean) => string;
  ariaLabel: string;
  filename: string;
}

function notesFor(
  context: StoryContext,
  datasetKey: string,
  classification: string,
): MandatoryNotes | null {
  const data = context.datasets[datasetKey];
  if (!data) return null;
  const { indicator } = data;
  return {
    indicator: indicator.name,
    indicatorId: indicator.id,
    geography: data.areaType.label,
    boundaryVintage: data.areaType.boundaryVintage,
    population: `${data.sex}, as published`,
    period: data.periodLabel,
    benchmark: context.manifest.coverage.benchmark.label,
    unit: indicator.unit ?? 'not stated',
    measureType: measureTypeLabel(indicator),
    classification,
    source: indicator.dataSource ?? 'Not stated',
    publisher: indicator.licence.publisher,
    licence: indicator.licence.name,
    retrievedAt: indicator.retrievedAt.slice(0, 10),
    limitation:
      'Descriptive, area-level observation. It supports no causal claim, and area-level ' +
      'patterns do not transfer to individuals.',
    dataVersion:
      `data schema ${context.manifest.schemaVersion}, prepared ` +
      `${context.manifest.generatedAt.slice(0, 10)}`,
    attribution: `${indicator.licence.attribution} Boundaries: ${
      context.manifest.licences.boundaries.attribution
    }`,
  };
}

function buildFigure(figure: FigureSpec, context: StoryContext): BuiltFigure | null {
  if (figure.kind === 'map') {
    const data = context.datasets[figure.dataset];
    if (!data) return null;
    const classification = classify(data.current, { method: 'quantile', classCount: 5 });
    const viewModel = buildMapViewModel({
      indicator: data.indicator,
      manifest: context.manifest,
      registry: data.registry,
      observationsByArea: new Map(data.current.map((o) => [o.areaCode, o])),
      classification,
      period: data.period,
      periodLabel: data.periodLabel,
      selectedAreaCode: null,
      comparisonAreaCodes: [],
      question: figure.caption,
    });
    const notes = notesFor(context, figure.dataset, viewModel.classificationNote);
    return {
      ariaLabel: `${viewModel.subtitle}. ${viewModel.classificationNote}`,
      filename: `story-${slug(data.indicator.shortName)}-map`,
      render: (width, standalone) =>
        renderMapSvg({
          viewModel,
          notes: notes!,
          composition: standalone ? 'figure' : 'plot-only',
          textScale: 'standard',
          headline: null,
          headlineIsUserAuthored: false,
          width: standalone ? 900 : width,
          height: standalone ? 1180 : Math.round(width * 1.05),
        }),
    };
  }

  if (figure.kind === 'dot-whisker') {
    const data = context.datasets[figure.dataset];
    if (!data) return null;
    const rows = figure.areaCodes.flatMap((code, index) => {
      const observation = data.current.find((o) => o.areaCode === code);
      if (!observation) return [];
      return [{
        areaCode: code,
        areaName: context.areaName(code),
        observation,
        isSelected: index === 0,
        selectionIndex: index,
      }];
    });
    if (rows.length === 0) return null;
    const benchmark = data.observations.benchmark.observations.find(
      (o) => o.period === data.period && o.sex === data.sex,
    );
    const notes = notesFor(context, figure.dataset, 'Not applicable to this chart.');
    return {
      ariaLabel: figure.caption,
      filename: `story-${slug(data.indicator.shortName)}-intervals`,
      render: (width, standalone) =>
        renderDotWhiskerSvg({
          rows,
          indicator: data.indicator,
          benchmark: isPresent(benchmark) ? benchmark : null,
          benchmarkLabel: context.manifest.coverage.benchmark.label,
          title: standalone ? figure.caption : '',
          subtitle: standalone ? `${data.areaType.label}, ${data.periodLabel}` : '',
          notes: standalone ? notes : null,
          width: standalone ? 900 : width,
          standalone,
        }),
    };
  }

  if (figure.kind === 'scatter') {
    const x = context.datasets[figure.xDataset];
    const y = context.datasets[figure.yDataset];
    if (!x || !y) return null;
    const paired = pairAreas(
      x.observations.observations, y.observations.observations,
      x.observations.periods, y.observations.periods,
    );
    if (!paired) return null;
    const points = paired.pairs.map((pair) => ({
      areaCode: pair.areaCode,
      areaName: context.areaName(pair.areaCode),
      x: pair.x,
      y: pair.y,
      isSelected: false,
    }));
    const notes = notesFor(context, figure.yDataset, 'Not applicable to this chart.');
    return {
      ariaLabel: figure.caption,
      filename: `story-${slug(y.indicator.shortName)}-vs-${slug(x.indicator.shortName)}`,
      render: (width, standalone) =>
        renderScatterSvg({
          points,
          xIndicator: x.indicator,
          yIndicator: y.indicator,
          title: standalone ? figure.caption : '',
          subtitle: standalone ? `${x.areaType.label}, ${paired.period}` : '',
          notes: standalone ? notes : null,
          width: standalone ? 900 : width,
          height: standalone ? 420 : 320,
          standalone,
        }),
    };
  }

  // Population groups for one area, drawn as a dot-and-whisker so the published
  // intervals stay visible rather than being hidden behind bar ends.
  const data = context.datasets[figure.dataset];
  if (!data) return null;
  const source =
    figure.areaCode === context.manifest.coverage.benchmark.areaCode
      ? data.observations.benchmark.observations
      : data.observations.observations;
  const rows = source
    .filter((o) => o.period === data.period && isPresent(o))
    .filter((o) => figure.areaCode === context.manifest.coverage.benchmark.areaCode
      || o.areaCode === figure.areaCode)
    .map((observation, index) => ({
      areaCode: `${observation.areaCode}-${observation.sex}`,
      areaName: observation.sex,
      observation,
      isSelected: false,
      selectionIndex: index,
    }));
  if (rows.length < 2) return null;
  const notes = notesFor(context, figure.dataset, 'Not applicable to this chart.');
  return {
    ariaLabel: figure.caption,
    filename: `story-${slug(data.indicator.shortName)}-by-group`,
    render: (width, standalone) =>
      renderDotWhiskerSvg({
        rows,
        indicator: data.indicator,
        benchmark: null,
        benchmarkLabel: context.manifest.coverage.benchmark.label,
        title: standalone ? figure.caption : '',
        subtitle: standalone ? data.periodLabel : '',
        notes: standalone ? notes : null,
        width: standalone ? 900 : width,
        standalone,
      }),
  };
}
