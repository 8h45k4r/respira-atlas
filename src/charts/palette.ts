/**
 * Data colour.
 *
 * The interface is Oxford blue (#002147) with brass as its counterpart. Data
 * colour follows the same two hues so that a figure lifted out of the atlas and
 * dropped into a report still reads as part of the same publication.
 *
 * Both ramps are monotonic in lightness, so they survive greyscale printing and
 * read correctly for deuteranopia and protanopia — which a red/green ramp does
 * not. There is no red/green opposition anywhere in this file.
 *
 * Non-data states sit deliberately outside both ramps: no reader should be able
 * to mistake "we do not know" for a value, however pale.
 */

/** Oxford tints, light to dark. Used for every sequential choropleth. */
export const SEQUENTIAL_OXFORD = [
  '#dde7f1', '#a9c0da', '#6d8fba', '#2f558c', '#002147',
] as const;

export const SEQUENTIAL_OXFORD_7 = [
  '#e9f0f6', '#c6d7e8', '#9cb6d3', '#7194bd', '#47719f', '#214e7c', '#002147',
] as const;

/**
 * Brass (low) → neutral → Oxford (high). Used for difference-from-benchmark
 * maps, where the two directions must be told apart at a glance without
 * implying "good" and "bad" by colour alone.
 */
export const DIVERGING_BRASS_OXFORD = [
  '#8a5f17', '#d8b468', '#eeeeec', '#6d8fba', '#002147',
] as const;

export const NON_DATA_STYLES = {
  /** Published geography, no value supplied. */
  missing: { fill: '#f0efed', stroke: '#c9c6c0', pattern: 'none' as const },
  /** Withheld by the publisher under disclosure control. */
  suppressed: { fill: '#e3e1dd', stroke: '#a3a099', pattern: 'hatch' as const },
  /** Nation not covered by the selected dataset. */
  outsideCoverage: { fill: '#f8f8f7', stroke: '#c9c6c0', pattern: 'diagonal' as const },
  /** Geography type does not exist here. */
  notApplicable: { fill: '#ffffff', stroke: '#e3e1dd', pattern: 'none' as const },
} as const;

export type NonDataStyleKey = keyof typeof NON_DATA_STYLES;

/**
 * Selection is shown by outline, never by changing a fill.
 *
 * Brass leads because it is the one hue that holds its own against every step
 * of the Oxford ramp — a dark blue outline disappears into the top classes.
 * The remaining three are chosen to stay separable from each other and from
 * the map, and are categorical, not a scale.
 */
export const SELECTION = {
  stroke: '#a9791f',
  strokeWidth: 2.25,
  comparisonStrokes: ['#a9791f', '#0f766e', '#86198f', '#9a3412'],
} as const;

export const CHART_INK = {
  axis: '#767370',
  grid: '#e3e1dd',
  text: '#001734',
  mutedText: '#585551',
  /** Benchmark is brass and dashed: a reference, not another observation. */
  benchmark: '#8a5f17',
  series: '#002147',
  interval: '#9cb6d3',
} as const;

export function sequentialRamp(classCount: number): readonly string[] {
  if (classCount <= 5) {
    // Evenly spaced subset, so a 3-class map still spans the whole ramp.
    const step = (SEQUENTIAL_OXFORD.length - 1) / Math.max(1, classCount - 1);
    return Array.from({ length: classCount }, (_, i) =>
      SEQUENTIAL_OXFORD[Math.round(i * step)],
    );
  }
  const step = (SEQUENTIAL_OXFORD_7.length - 1) / Math.max(1, classCount - 1);
  return Array.from({ length: classCount }, (_, i) =>
    SEQUENTIAL_OXFORD_7[Math.round(i * step)],
  );
}

export function divergingRamp(classCount: number): readonly string[] {
  const step = (DIVERGING_BRASS_OXFORD.length - 1) / Math.max(1, classCount - 1);
  return Array.from({ length: classCount }, (_, i) =>
    DIVERGING_BRASS_OXFORD[Math.round(i * step)],
  );
}

/** Text colour with sufficient contrast against a ramp swatch. */
export function onRamp(index: number, classCount: number): string {
  return index >= Math.ceil(classCount / 2) ? '#ffffff' : '#001734';
}
