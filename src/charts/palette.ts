/**
 * Palettes are colour-blind-conscious and avoid any red/green opposition.
 *
 * The sequential ramp is a single-hue teal progression: it is monotonic in
 * lightness, so it survives greyscale printing and reads correctly for
 * deuteranopia and protanopia, where a red-green ramp does not. The diverging
 * ramp runs teal–neutral–purple for the same reason.
 *
 * Non-data states are intentionally outside both ramps: no reader should be able
 * to mistake "we do not know" for a value, however light.
 */

export const SEQUENTIAL_TEAL = [
  '#e4f3f1', '#b9e1dd', '#7cc6c1', '#419f9d', '#1f6563',
] as const;

export const SEQUENTIAL_TEAL_7 = [
  '#eef8f7', '#d2ebe8', '#aadcd7', '#7cc6c1', '#4ba8a4', '#2a8280', '#1a5453',
] as const;

/** Teal (low) → neutral → purple (high). No red/green dependence. */
export const DIVERGING_TEAL_PURPLE = [
  '#1f6563', '#7cc6c1', '#e8ebef', '#b49ccb', '#5b3f82',
] as const;

export const NON_DATA_STYLES = {
  /** Published geography, no value supplied. */
  missing: { fill: '#f1f5f9', stroke: '#cbd5e1', pattern: 'none' as const },
  /** Withheld by the publisher under disclosure control. */
  suppressed: { fill: '#e2e8f0', stroke: '#94a3b8', pattern: 'hatch' as const },
  /** Nation not covered by the selected dataset. */
  outsideCoverage: { fill: '#f8fafc', stroke: '#b6c2d1', pattern: 'diagonal' as const },
  /** Geography type does not exist here. */
  notApplicable: { fill: '#ffffff', stroke: '#cbd5e1', pattern: 'none' as const },
} as const;

export type NonDataStyleKey = keyof typeof NON_DATA_STYLES;

/** Selection is shown by outline and a non-colour cue, never by changing fill. */
export const SELECTION = {
  stroke: '#141f36',
  strokeWidth: 2.25,
  /** Comparison slots get distinguishable outlines, not distinguishable fills. */
  comparisonStrokes: ['#141f36', '#1f6563', '#5b3f82', '#8a5a1b'],
} as const;

export const CHART_INK = {
  axis: '#64748b',
  grid: '#e2e8f0',
  text: '#1f2d4d',
  mutedText: '#475569',
  benchmark: '#5b3f82',
  series: '#1f6563',
  interval: '#7cc6c1',
} as const;

export function sequentialRamp(classCount: number): readonly string[] {
  if (classCount <= 5) {
    // Take an evenly spaced subset so a 3-class map still spans the full ramp.
    const step = (SEQUENTIAL_TEAL.length - 1) / Math.max(1, classCount - 1);
    return Array.from({ length: classCount }, (_, i) =>
      SEQUENTIAL_TEAL[Math.round(i * step)],
    );
  }
  const step = (SEQUENTIAL_TEAL_7.length - 1) / Math.max(1, classCount - 1);
  return Array.from({ length: classCount }, (_, i) =>
    SEQUENTIAL_TEAL_7[Math.round(i * step)],
  );
}

/** Text colour with sufficient contrast against a ramp swatch. */
export function onRamp(index: number, classCount: number): string {
  return index >= Math.ceil(classCount / 2) ? '#ffffff' : '#141f36';
}
