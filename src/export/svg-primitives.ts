/**
 * Minimal SVG document builder.
 *
 * Everything emitted here is real vector content — `<path>`, `<text>`, `<rect>`,
 * `<line>` — with no embedded raster. There is no `<image>` element anywhere in
 * this module, which is what makes the "vector SVG" claim true rather than a
 * PNG wrapped in an SVG envelope.
 */

export interface SvgTextOptions {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly weight?: number;
  readonly fill?: string;
  readonly anchor?: 'start' | 'middle' | 'end';
  readonly family?: string;
  readonly letterSpacing?: number;
  readonly opacity?: number;
}

export const FIGURE_FONT =
  "'IBM Plex Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function text(content: string, options: SvgTextOptions): string {
  const attributes = [
    `x="${round(options.x)}"`,
    `y="${round(options.y)}"`,
    `font-family="${options.family ?? FIGURE_FONT}"`,
    `font-size="${options.size}"`,
    `fill="${options.fill ?? '#1f2d4d'}"`,
  ];
  if (options.weight) attributes.push(`font-weight="${options.weight}"`);
  if (options.anchor) attributes.push(`text-anchor="${options.anchor}"`);
  if (options.letterSpacing) attributes.push(`letter-spacing="${options.letterSpacing}"`);
  if (options.opacity !== undefined) attributes.push(`opacity="${options.opacity}"`);
  return `<text ${attributes.join(' ')}>${escapeXml(content)}</text>`;
}

/** Wraps a string to a pixel width using an average-glyph approximation. */
export function wrapText(content: string, size: number, maxWidth: number): string[] {
  const perChar = size * 0.52;
  const maxChars = Math.max(12, Math.floor(maxWidth / perChar));
  const words = content.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function paragraph(
  content: string,
  options: SvgTextOptions & { maxWidth: number; lineHeight?: number },
): { svg: string; height: number } {
  const lines = wrapText(content, options.size, options.maxWidth);
  const lineHeight = options.lineHeight ?? options.size * 1.42;
  const svg = lines
    .map((line, index) =>
      text(line, { ...options, y: options.y + index * lineHeight }),
    )
    .join('\n');
  return { svg, height: lines.length * lineHeight };
}

export function rect(
  x: number, y: number, width: number, height: number,
  attributes: { fill?: string; stroke?: string; strokeWidth?: number; rx?: number; opacity?: number } = {},
): string {
  const parts = [
    `x="${round(x)}"`, `y="${round(y)}"`,
    `width="${round(width)}"`, `height="${round(height)}"`,
  ];
  parts.push(`fill="${attributes.fill ?? 'none'}"`);
  if (attributes.stroke) parts.push(`stroke="${attributes.stroke}"`);
  if (attributes.strokeWidth !== undefined) parts.push(`stroke-width="${attributes.strokeWidth}"`);
  if (attributes.rx !== undefined) parts.push(`rx="${attributes.rx}"`);
  if (attributes.opacity !== undefined) parts.push(`opacity="${attributes.opacity}"`);
  return `<rect ${parts.join(' ')} />`;
}

export function line(
  x1: number, y1: number, x2: number, y2: number,
  attributes: { stroke?: string; strokeWidth?: number; dash?: string; opacity?: number } = {},
): string {
  const parts = [
    `x1="${round(x1)}"`, `y1="${round(y1)}"`,
    `x2="${round(x2)}"`, `y2="${round(y2)}"`,
    `stroke="${attributes.stroke ?? '#64748b'}"`,
    `stroke-width="${attributes.strokeWidth ?? 1}"`,
  ];
  if (attributes.dash) parts.push(`stroke-dasharray="${attributes.dash}"`);
  if (attributes.opacity !== undefined) parts.push(`opacity="${attributes.opacity}"`);
  return `<line ${parts.join(' ')} />`;
}

export function path(
  d: string,
  attributes: {
    fill?: string; stroke?: string; strokeWidth?: number;
    fillRule?: string; opacity?: number;
  } = {},
): string {
  const parts = [`d="${d}"`, `fill="${attributes.fill ?? 'none'}"`];
  if (attributes.stroke) parts.push(`stroke="${attributes.stroke}"`);
  if (attributes.strokeWidth !== undefined) parts.push(`stroke-width="${attributes.strokeWidth}"`);
  if (attributes.fillRule) parts.push(`fill-rule="${attributes.fillRule}"`);
  if (attributes.opacity !== undefined) parts.push(`opacity="${attributes.opacity}"`);
  parts.push('stroke-linejoin="round"', 'stroke-linecap="round"');
  return `<path ${parts.join(' ')} />`;
}

export function circle(
  cx: number, cy: number, r: number,
  attributes: { fill?: string; stroke?: string; strokeWidth?: number } = {},
): string {
  const parts = [`cx="${round(cx)}"`, `cy="${round(cy)}"`, `r="${round(r)}"`];
  parts.push(`fill="${attributes.fill ?? '#1f6563'}"`);
  if (attributes.stroke) parts.push(`stroke="${attributes.stroke}"`);
  if (attributes.strokeWidth !== undefined) parts.push(`stroke-width="${attributes.strokeWidth}"`);
  return `<circle ${parts.join(' ')} />`;
}

export function group(content: string, transform?: string, extra?: string): string {
  const attributes = [transform ? `transform="${transform}"` : '', extra ?? '']
    .filter(Boolean)
    .join(' ');
  return `<g${attributes ? ` ${attributes}` : ''}>\n${content}\n</g>`;
}

/** Hatch and diagonal patterns for non-data areas, defined as vector strokes. */
export function nonDataPatternDefs(): string {
  return `
<pattern id="pattern-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
  <rect width="6" height="6" fill="${'#e2e8f0'}" />
  <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" stroke-width="0.9" />
</pattern>
<pattern id="pattern-diagonal" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="7" height="7" fill="#f8fafc" />
  <line x1="0" y1="0" x2="0" y2="7" stroke="#b6c2d1" stroke-width="0.9" />
</pattern>`.trim();
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface SvgDocumentOptions {
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly description: string;
  /** White by default: figures are made to be printed and pasted into documents. */
  readonly background?: string;
  readonly defs?: string;
}

export function svgDocument(content: string, options: SvgDocumentOptions): string {
  const background = options.background ?? '#ffffff';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${options.width}" height="${options.height}"
     viewBox="0 0 ${options.width} ${options.height}"
     role="img" aria-labelledby="figure-title figure-desc">
  <title id="figure-title">${escapeXml(options.title)}</title>
  <desc id="figure-desc">${escapeXml(options.description)}</desc>
  <defs>
${options.defs ?? ''}
  </defs>
  <rect x="0" y="0" width="${options.width}" height="${options.height}" fill="${background}" />
${content}
</svg>`;
}
