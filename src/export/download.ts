import type { Indicator } from '@/data/schemas/manifest';
import type { Observation } from '@/data/schemas/observation';
import { isPresent } from '@/data/schemas/observation';
import type { MapViewModel } from '@/charts/map-view-model';
import type { FigureSpec, MandatoryNotes } from './figure-spec';
import { mandatoryNoteLines } from './figure-spec';
import { slug } from '@/lib/utils';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick so the navigation has started.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadSvg(svg: string, basename: string) {
  triggerDownload(
    new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
    `${slug(basename)}.svg`,
  );
}

export function downloadJson(value: unknown, basename: string) {
  triggerDownload(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    `${slug(basename)}.json`,
  );
}

export function downloadCsv(csv: string, basename: string) {
  // The BOM keeps Excel from mangling the non-ASCII characters in µg/m3 and en dashes.
  triggerDownload(
    new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }),
    `${slug(basename)}.csv`,
  );
}

export class ExportError extends Error {}

/**
 * Rasterises the SVG to PNG at a chosen pixel ratio.
 *
 * This is the one place a raster is produced, and it is produced *from* the
 * vector figure rather than from a screenshot of the DOM, so the PNG shows the
 * same geometry and text as the SVG — no menus, tooltips, loading skeletons or
 * clipped legends can appear in it.
 */
export async function downloadPng(
  svg: string,
  basename: string,
  { scale = 3, background = '#ffffff' }: { scale?: number; background?: string } = {},
): Promise<void> {
  const widthMatch = /width="(\d+(?:\.\d+)?)"/.exec(svg);
  const heightMatch = /height="(\d+(?:\.\d+)?)"/.exec(svg);
  if (!widthMatch || !heightMatch) {
    throw new ExportError('Could not determine figure dimensions for the PNG export.');
  }
  const width = Number(widthMatch[1]);
  const height = Number(heightMatch[1]);

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new ExportError('The figure could not be rasterised in this browser.'));
      element.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new ExportError('This browser did not provide a 2D canvas context.');
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.drawImage(image, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (!pngBlob) throw new ExportError('The PNG could not be encoded.');
    triggerDownload(pngBlob, `${slug(basename)}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Fully-qualified CSV of exactly the rows behind the current figure. */
export function buildFilteredCsv(
  viewModel: MapViewModel,
  indicator: Indicator,
  notes: MandatoryNotes,
  period: string,
): string {
  const header = [
    'area_code', 'area_name', 'nation', 'geography', 'boundary_vintage',
    'indicator_id', 'indicator_name', 'period', 'population', 'unit', 'measure_type',
    'availability', 'value', 'lower_ci_95', 'upper_ci_95',
    'lower_ci_998', 'upper_ci_998', 'count', 'denominator',
    'compared_with_benchmark', 'publisher_trend', 'value_note',
  ];

  const escape = (value: unknown): string => {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = viewModel.areas.map((area) => {
    const o: Observation | undefined = area.observation;
    // Availability is always stated, so a blank value column can never be
    // mistaken for a zero by whoever opens the file.
    const availability = o?.state ?? 'no-observation';
    return [
      area.code, area.name, area.nation, notes.geography, notes.boundaryVintage ?? '',
      indicator.id, indicator.name, period, notes.population,
      indicator.unit ?? '', notes.measureType,
      availability,
      isPresent(o) ? o.value : '',
      isPresent(o) ? (o.lowerCi95 ?? '') : '',
      isPresent(o) ? (o.upperCi95 ?? '') : '',
      isPresent(o) ? (o.lowerCi998 ?? '') : '',
      isPresent(o) ? (o.upperCi998 ?? '') : '',
      isPresent(o) ? (o.count ?? '') : '',
      isPresent(o) ? (o.denominator ?? '') : '',
      o?.significance ?? '', o?.trend ?? '', o?.note ?? '',
    ].map(escape).join(',');
  });

  // Commented provenance block, so the file is still self-describing after
  // being emailed around detached from the app.
  const preamble = mandatoryNoteLines(notes).map((n) => `# ${n}`);
  preamble.push(
    '# availability: present = a published value (including a value of 0);',
    '#               missing = no value published; suppressed = withheld by the publisher;',
    '#               not-applicable = the measure does not apply; no-observation = no row supplied.',
    '# An empty value column with availability other than "present" is NOT a zero.',
  );

  return [...preamble, header.join(','), ...rows].join('\n');
}

export function downloadFigureSpec(spec: FigureSpec, basename: string) {
  downloadJson(spec, `${basename}-figure-spec`);
}
