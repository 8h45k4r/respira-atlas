import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderMapSvg } from '@/export/map-svg';
import { buildMapViewModel } from '@/charts/map-view-model';
import { classify } from '@/data/selectors/classification';
import { AreaRegistry } from '@/geography/model';
import { decodeObservations } from '@/data/validation/decode';
import { boundaryLayerSchema } from '@/data/schemas/geography';
import { manifestSchema, indicatorSchema } from '@/data/schemas/manifest';
import type { Observation } from '@/data/schemas/observation';
import type { MandatoryNotes } from '@/export/figure-spec';
import { z } from 'zod';

const DATA = 'public/data';
const read = (p: string) => JSON.parse(readFileSync(`${DATA}/${p}`, 'utf8'));

let viewModel: ReturnType<typeof buildMapViewModel>;
let notes: MandatoryNotes;

beforeAll(() => {
  const manifest = manifestSchema.parse(read('manifest.json'));
  const indicators = z
    .object({ schemaVersion: z.number(), indicators: z.array(indicatorSchema) })
    .parse(read('indicators/index.json')).indicators;

  // A real indicator published at the UK-wide administrative layer, so the
  // figure includes nations the dataset does not cover.
  const indicator = indicators.find((i) => i.geographies.ctyua23)!;
  const availability = indicator.geographies.ctyua23;
  const areaType = manifest.areaTypes.ctyua23;
  const layer = boundaryLayerSchema.parse(read(areaType.file));
  const registry = new AreaRegistry(areaType, layer);

  const file = read(availability.file);
  const observations = decodeObservations(file.data);
  const period = availability.latestPeriod!;
  const forPeriod = observations.filter((o: Observation) => o.period === period);
  const byArea = new Map(forPeriod.map((o: Observation) => [o.areaCode, o]));

  const classification = classify(forPeriod, { method: 'quantile', classCount: 5 });

  viewModel = buildMapViewModel({
    indicator, manifest, registry,
    observationsByArea: byArea,
    classification,
    period,
    periodLabel: period,
    selectedAreaCode: forPeriod[0].areaCode,
    comparisonAreaCodes: [forPeriod[1].areaCode],
    question: 'How does respiratory disease burden vary across upper-tier local authorities?',
  });

  notes = {
    indicator: indicator.name,
    indicatorId: indicator.id,
    geography: areaType.label,
    boundaryVintage: areaType.boundaryVintage,
    population: 'all persons, all ages',
    period,
    benchmark: 'England',
    unit: indicator.unit ?? '',
    measureType: indicator.valueType ?? '',
    classification: viewModel.classificationNote,
    source: indicator.dataSource ?? '',
    publisher: indicator.licence.publisher,
    licence: indicator.licence.name,
    retrievedAt: indicator.retrievedAt.slice(0, 10),
    limitation: 'Descriptive, area-level observation. No causal claim is supported.',
    dataVersion: `schema ${manifest.schemaVersion}, generated ${manifest.generatedAt.slice(0, 10)}`,
    attribution: indicator.licence.attribution,
  };
});

describe('map SVG export is genuine vector', () => {
  it('contains real path geometry, not a raster', () => {
    const svg = renderMapSvg({
      viewModel, notes, composition: 'figure', textScale: 'standard',
      headline: null, headlineIsUserAuthored: false,
    });
    const paths = svg.match(/<path\s[^>]*d="[^"]{40,}"/g) ?? [];
    expect(paths.length).toBeGreaterThan(100);
    // No embedded raster of any kind.
    expect(svg).not.toMatch(/<image/i);
    expect(svg).not.toMatch(/data:image\/(png|jpe?g|webp)/i);
    expect(svg).not.toMatch(/<foreignObject/i);
  });

  it('emits selectable text rather than outlined glyphs', () => {
    const svg = renderMapSvg({
      viewModel, notes, composition: 'figure', textScale: 'standard',
      headline: null, headlineIsUserAuthored: false,
    });
    const texts = svg.match(/<text\s/g) ?? [];
    expect(texts.length).toBeGreaterThan(8);
    expect(svg).toMatch(/font-family="'IBM Plex Sans'/);
  });

  it('carries every mandatory note', () => {
    const svg = renderMapSvg({
      viewModel, notes, composition: 'figure', textScale: 'standard',
      headline: null, headlineIsUserAuthored: false,
    });
    expect(svg).toContain(String(notes.indicatorId));
    expect(svg).toMatch(/Open Government Licence/);
    expect(svg).toMatch(/Benchmark: England/);
    expect(svg).toMatch(/boundaries July 2022|boundaries May 2023/);
    expect(svg).toMatch(/Quantile/i);
    expect(svg).toMatch(/Data version/);
    expect(svg).toMatch(/No causal claim/i);
  });

  it('declares a white background by default', () => {
    const svg = renderMapSvg({
      viewModel, notes, composition: 'figure', textScale: 'standard',
      headline: null, headlineIsUserAuthored: false,
    });
    expect(svg).toMatch(/<rect x="0" y="0"[^>]*fill="#ffffff"/);
  });

  it('labels a user-authored headline as user-authored', () => {
    const svg = renderMapSvg({
      viewModel, notes, composition: 'figure', textScale: 'standard',
      headline: 'COPD admissions are concentrated in the north',
      headlineIsUserAuthored: true,
    });
    expect(svg).toMatch(/Headline written by the user of this atlas/);
    expect(svg).toMatch(/concentrated in the north/);
  });

  it('includes a hatch pattern for out-of-coverage nations', () => {
    expect(viewModel.counts.outsideCoverage).toBeGreaterThan(0);
    const svg = renderMapSvg({
      viewModel, notes, composition: 'figure', textScale: 'standard',
      headline: null, headlineIsUserAuthored: false,
    });
    expect(svg).toMatch(/pattern id="pattern-diagonal"/);
    expect(svg).toMatch(/url\(#pattern-diagonal\)/);
    expect(svg).toMatch(/Not covered by this dataset/);
  });

  it('respects the requested text scale', () => {
    const compact = renderMapSvg({
      viewModel, notes, composition: 'figure', textScale: 'compact',
      headline: null, headlineIsUserAuthored: false,
    });
    const large = renderMapSvg({
      viewModel, notes, composition: 'figure', textScale: 'large',
      headline: null, headlineIsUserAuthored: false,
    });
    expect(compact).toMatch(/font-size="14"/);
    expect(large).toMatch(/font-size="21"/);
  });

  it('omits titles and notes in plot-only composition', () => {
    const plotOnly = renderMapSvg({
      viewModel, notes, composition: 'plot-only', textScale: 'standard',
      headline: null, headlineIsUserAuthored: false,
    });
    expect(plotOnly).not.toMatch(/Open Government Licence/);
    expect(plotOnly).toMatch(/<path\s/);
  });

  it('is well-formed XML with an accessible title and description', () => {
    const svg = renderMapSvg({
      viewModel, notes, composition: 'figure', textScale: 'standard',
      headline: null, headlineIsUserAuthored: false,
    });
    expect(svg.startsWith('<?xml')).toBe(true);
    expect(svg).toMatch(/<title id="figure-title">/);
    expect(svg).toMatch(/<desc id="figure-desc">/);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    // Tags must balance.
    const open = (svg.match(/<g[\s>]/g) ?? []).length;
    const close = (svg.match(/<\/g>/g) ?? []).length;
    expect(open).toBe(close);
  });
});
