import { geoPath } from 'd3-geo';
import * as am5map from '@amcharts/amcharts5/map';
import type { MapViewModel } from '@/charts/map-view-model';
import { NON_DATA_STYLES, SELECTION } from '@/charts/palette';
import {
  svgDocument, path, text, rect, group, paragraph, nonDataPatternDefs,
  FIGURE_FONT, round,
} from './svg-primitives';
import { TEXT_SCALES, mandatoryNoteLines, type FigureComposition, type MandatoryNotes } from './figure-spec';

export interface MapSvgOptions {
  readonly viewModel: MapViewModel;
  readonly notes: MandatoryNotes;
  readonly composition: FigureComposition;
  readonly textScale: keyof typeof TEXT_SCALES;
  readonly headline: string | null;
  readonly headlineIsUserAuthored: boolean;
  readonly evidenceSentence?: string | null;
  readonly width?: number;
  readonly height?: number;
}

const DIMENSIONS: Record<FigureComposition, { width: number; height: number }> = {
  'plot-only': { width: 760, height: 900 },
  figure: { width: 900, height: 1180 },
  presentation: { width: 1280, height: 720 },
  'a4-brief': { width: 794, height: 1123 },
};

/**
 * Renders the map as genuine vector SVG.
 *
 * The projection is `am5map.geoMercator()` — the very function the interactive
 * chart is configured with, which returns a d3-geo projection. Feeding it to
 * d3-geo's `geoPath` therefore reproduces the on-screen geometry exactly rather
 * than approximating it, and the class breaks, colours, selection outlines and
 * non-data styling all come from the same view model the screen used.
 */
export function renderMapSvg(options: MapSvgOptions): string {
  const { viewModel, notes, composition } = options;
  const scale = TEXT_SCALES[options.textScale];
  const base = DIMENSIONS[composition];
  const width = options.width ?? base.width;
  const height = options.height ?? base.height;

  const margin = composition === 'plot-only' ? 12 : 28;
  const isPresentation = composition === 'presentation';

  let cursor = margin;
  const header: string[] = [];
  const contentWidth = width - margin * 2;

  if (composition !== 'plot-only') {
    if (options.headline && options.headline.trim() !== '') {
      const wrapped = paragraph(options.headline.trim(), {
        x: margin, y: cursor + scale.title, size: scale.title, weight: 600,
        fill: '#141f36', maxWidth: contentWidth, lineHeight: scale.title * 1.3,
      });
      header.push(wrapped.svg);
      cursor += wrapped.height + 4;
      if (options.headlineIsUserAuthored) {
        header.push(
          text('Headline written by the user of this atlas, not by the data publisher.', {
            x: margin, y: cursor + scale.small, size: scale.small, fill: '#64748b',
          }),
        );
        cursor += scale.small * 1.7;
      }
    }

    const questionWrapped = paragraph(viewModel.title, {
      x: margin,
      y: cursor + scale.body,
      size: options.headline ? scale.body : scale.title,
      weight: options.headline ? 500 : 600,
      fill: options.headline ? '#334155' : '#141f36',
      maxWidth: contentWidth,
      lineHeight: (options.headline ? scale.body : scale.title) * 1.32,
    });
    header.push(questionWrapped.svg);
    cursor += questionWrapped.height + 2;

    const subtitleWrapped = paragraph(viewModel.subtitle, {
      x: margin, y: cursor + scale.small, size: scale.small, fill: '#475569',
      maxWidth: contentWidth, lineHeight: scale.small * 1.4,
    });
    header.push(subtitleWrapped.svg);
    cursor += subtitleWrapped.height + 10;

    header.push(
      `<line x1="${margin}" y1="${round(cursor)}" x2="${round(width - margin)}" y2="${round(cursor)}" stroke="#cbd5e1" stroke-width="1" />`,
    );
    cursor += 12;
  }

  // ------------------------------------------------------------------ footer
  const footerLines = mandatoryNoteLines(notes);
  const footerFragments: string[] = [];
  let footerHeight = 0;
  if (composition !== 'plot-only') {
    for (const noteLine of footerLines) {
      const wrapped = paragraph(noteLine, {
        x: margin, y: 0, size: scale.small, fill: '#475569',
        maxWidth: contentWidth, lineHeight: scale.small * 1.38,
      });
      footerFragments.push(wrapped.svg);
      footerHeight += wrapped.height + 1;
    }
    footerHeight += 14;
  }

  // ------------------------------------------------------- legend dimensions
  const legendRowHeight = scale.body * 1.72;
  const legendColumns = isPresentation ? 2 : 1;
  const legendRows = Math.ceil(viewModel.legend.length / legendColumns);
  const legendHeight =
    viewModel.legend.length > 0
      ? legendRows * legendRowHeight + scale.small * 2.6 + 8
      : 0;

  // -------------------------------------------------------------- map canvas
  const evidenceHeight =
    options.evidenceSentence && composition !== 'plot-only'
      ? paragraph(options.evidenceSentence, {
          x: 0, y: 0, size: scale.body, maxWidth: contentWidth,
          lineHeight: scale.body * 1.45,
        }).height + 14
      : 0;

  const mapTop = cursor;
  const mapWidth = isPresentation ? contentWidth * 0.56 : contentWidth;
  const mapHeight =
    height - mapTop - margin - footerHeight - evidenceHeight -
    (isPresentation ? 0 : legendHeight);

  const featureCollection = {
    type: 'FeatureCollection' as const,
    features: viewModel.areas.map((area) => area.feature),
  };

  // The identical projection family the interactive chart uses.
  const projection = am5map.geoMercator();
  projection.fitExtent(
    [
      [0, 0],
      [mapWidth, Math.max(80, mapHeight)],
    ],
    featureCollection as never,
  );
  const generator = geoPath(projection);

  const polygons: string[] = [];
  const selectionOutlines: string[] = [];

  for (const area of viewModel.areas) {
    const d = generator(area.feature as never);
    if (!d) continue;

    const fill =
      area.render.kind === 'value'
        ? area.render.fill
        : NON_DATA_STYLES[area.render.style].pattern === 'hatch'
          ? 'url(#pattern-hatch)'
          : NON_DATA_STYLES[area.render.style].pattern === 'diagonal'
            ? 'url(#pattern-diagonal)'
            : NON_DATA_STYLES[area.render.style].fill;

    const strokeColour =
      area.render.kind === 'non-data'
        ? NON_DATA_STYLES[area.render.style].stroke
        : '#ffffff';

    polygons.push(path(d, { fill, stroke: strokeColour, strokeWidth: 0.5, fillRule: 'evenodd' }));

    // Selected outlines are drawn last so no neighbour clips them.
    if (area.selectionIndex !== null) {
      selectionOutlines.push(
        path(d, {
          fill: 'none',
          stroke: SELECTION.comparisonStrokes[
            area.selectionIndex % SELECTION.comparisonStrokes.length
          ],
          strokeWidth: SELECTION.strokeWidth,
        }),
      );
    }
  }

  const mapGroup = group(
    [...polygons, ...selectionOutlines].join('\n'),
    `translate(${margin}, ${round(mapTop)})`,
  );

  // ------------------------------------------------------------------ legend
  const legendFragments: string[] = [];
  if (viewModel.legend.length > 0) {
    const legendX = isPresentation ? margin + mapWidth + 24 : margin;
    const legendY = isPresentation ? mapTop : mapTop + mapHeight + 10;
    const legendWidth = isPresentation ? contentWidth - mapWidth - 24 : contentWidth;

    legendFragments.push(
      text(
        viewModel.unitLabel
          ? `Key — ${viewModel.unitLabel}`
          : 'Key',
        { x: legendX, y: legendY + scale.small, size: scale.small, weight: 600, fill: '#334155' },
      ),
    );

    const columnWidth = legendWidth / legendColumns;
    viewModel.legend.forEach((entry, index) => {
      const column = index % legendColumns;
      const row = Math.floor(index / legendColumns);
      const x = legendX + column * columnWidth;
      const y = legendY + scale.small * 2.3 + row * legendRowHeight;
      const swatch =
        entry.pattern === 'hatch' ? 'url(#pattern-hatch)'
        : entry.pattern === 'diagonal' ? 'url(#pattern-diagonal)'
        : entry.swatch;
      legendFragments.push(
        rect(x, y, scale.body * 1.5, scale.body * 1.05, {
          fill: swatch, stroke: '#94a3b8', strokeWidth: 0.6,
        }),
      );
      legendFragments.push(
        text(
          entry.count !== null ? `${entry.label}  (${entry.count})` : entry.label,
          {
            x: x + scale.body * 2.1,
            y: y + scale.body * 0.92,
            size: scale.body * 0.92,
            fill: '#1f2d4d',
          },
        ),
      );
    });
  }

  // -------------------------------------------------------- evidence + notes
  const bodyFragments: string[] = [];
  let bodyCursor = mapTop + mapHeight + (isPresentation ? 0 : legendHeight) + 8;

  if (options.evidenceSentence && composition !== 'plot-only') {
    const wrapped = paragraph(options.evidenceSentence, {
      x: margin, y: bodyCursor + scale.body, size: scale.body, fill: '#1f2d4d',
      maxWidth: contentWidth, lineHeight: scale.body * 1.45,
    });
    bodyFragments.push(wrapped.svg);
    bodyCursor += wrapped.height + 10;
  }

  if (composition !== 'plot-only') {
    bodyFragments.push(
      `<line x1="${margin}" y1="${round(bodyCursor)}" x2="${round(width - margin)}" y2="${round(bodyCursor)}" stroke="#cbd5e1" stroke-width="1" />`,
    );
    bodyCursor += 10;
    let noteCursor = bodyCursor;
    for (const noteLine of footerLines) {
      const wrapped = paragraph(noteLine, {
        x: margin, y: noteCursor + scale.small, size: scale.small, fill: '#475569',
        maxWidth: contentWidth, lineHeight: scale.small * 1.38,
      });
      bodyFragments.push(wrapped.svg);
      noteCursor += wrapped.height + 1;
    }
  }

  const description =
    `${viewModel.title}. ${viewModel.subtitle}. ${viewModel.classificationNote} ` +
    `${viewModel.counts.withValue} areas have a value; ${viewModel.counts.missing} have none; ` +
    `${viewModel.counts.suppressed} are suppressed; ` +
    `${viewModel.counts.outsideCoverage} are outside dataset coverage.`;

  return svgDocument(
    [...header, mapGroup, ...legendFragments, ...bodyFragments].join('\n'),
    {
      width,
      height,
      title: options.headline?.trim() || viewModel.title,
      description,
      background: '#ffffff',
      defs: nonDataPatternDefs(),
    },
  );
}

export { FIGURE_FONT };
