import type { Indicator, Manifest } from '@/data/schemas/manifest';
import type { AreaFeature } from '@/data/schemas/geography';
import type { Observation } from '@/data/schemas/observation';
import { isPresent } from '@/data/schemas/observation';
import type { Classification } from '@/data/selectors/classification';
import { classOf } from '@/data/selectors/classification';
import { sequentialRamp, NON_DATA_STYLES, SELECTION, type NonDataStyleKey } from './palette';
import { formatWithUnit, formatInterval } from '@/data/selectors/format';
import type { AreaRegistry } from '@/geography/model';

/**
 * The map view model.
 *
 * Both the interactive amCharts map and the SVG export renderer consume this and
 * nothing else, which is what makes a downloaded figure match the screen: the
 * class breaks, colours, selection outlines and non-data styling are decided
 * once, here, rather than twice in two renderers.
 */

export type AreaRenderState =
  | { kind: 'value'; classIndex: number; value: number; fill: string }
  | { kind: 'non-data'; style: NonDataStyleKey; reason: string };

export interface AreaViewModel {
  readonly code: string;
  readonly name: string;
  readonly nation: string;
  readonly feature: AreaFeature;
  readonly observation: Observation | undefined;
  readonly render: AreaRenderState;
  readonly stroke: string;
  readonly strokeWidth: number;
  /** Non-colour cue for selection, so colour is never the only signal. */
  readonly selectionIndex: number | null;
  readonly isSelected: boolean;
  /** Plain-text tooltip and accessible description. */
  readonly description: string;
}

export interface MapLegendEntry {
  readonly label: string;
  readonly swatch: string;
  readonly count: number | null;
  readonly kind: 'class' | 'non-data';
  readonly pattern: 'none' | 'hatch' | 'diagonal';
}

export interface MapViewModel {
  readonly areas: readonly AreaViewModel[];
  readonly classification: Classification | null;
  readonly legend: readonly MapLegendEntry[];
  readonly ramp: readonly string[];
  readonly title: string;
  readonly subtitle: string;
  readonly unitLabel: string;
  readonly classificationNote: string;
  readonly coverageNote: string | null;
  readonly counts: {
    readonly withValue: number;
    readonly missing: number;
    readonly suppressed: number;
    readonly outsideCoverage: number;
  };
}

export interface BuildMapViewModelInput {
  readonly indicator: Indicator;
  readonly manifest: Manifest;
  readonly registry: AreaRegistry;
  readonly observationsByArea: ReadonlyMap<string, Observation>;
  readonly classification: Classification | null;
  readonly period: string;
  readonly periodLabel: string;
  readonly selectedAreaCode: string | null;
  readonly comparisonAreaCodes: readonly string[];
  readonly question: string;
}

function describeArea(
  name: string,
  indicator: Indicator,
  observation: Observation | undefined,
  render: AreaRenderState,
  periodLabel: string,
): string {
  if (render.kind === 'value' && isPresent(observation)) {
    const parts = [
      `${name}: ${formatWithUnit(observation.value, indicator)} in ${periodLabel}`,
    ];
    if (observation.lowerCi95 !== null && observation.upperCi95 !== null) {
      parts.push(
        `95% CI ${formatInterval(observation.lowerCi95, observation.upperCi95, indicator)}`,
      );
    }
    if (observation.count !== null && indicator.countIsMeaningful) {
      parts.push(`count ${observation.count.toLocaleString('en-GB')}`);
    }
    return parts.join('; ');
  }
  return `${name}: ${render.kind === 'non-data' ? render.reason : 'no value'}`;
}

export function buildMapViewModel(input: BuildMapViewModelInput): MapViewModel {
  const {
    indicator, manifest, registry, observationsByArea, classification,
    periodLabel, selectedAreaCode, comparisonAreaCodes, question,
  } = input;

  const ramp = classification ? sequentialRamp(classification.classCount) : [];
  const nationsWithData = new Set(manifest.coverage.nationsWithData);

  let withValue = 0;
  let missing = 0;
  let suppressed = 0;
  let outsideCoverage = 0;

  const areas: AreaViewModel[] = registry.all().map((area) => {
    const observation = observationsByArea.get(area.code);
    let render: AreaRenderState;

    if (!nationsWithData.has(area.nation)) {
      // A nation the dataset does not cover is never coloured as a value and
      // never as zero: it is styled as outside coverage and says so.
      outsideCoverage += 1;
      render = {
        kind: 'non-data',
        style: 'outsideCoverage',
        reason: `Not covered by this dataset (${indicator.coverage.nations.join(', ')} only)`,
      };
    } else if (isPresent(observation) && classification) {
      const classIndex = classOf(classification, observation.value);
      if (classIndex === null) {
        missing += 1;
        render = { kind: 'non-data', style: 'missing', reason: 'Value outside the colour scale' };
      } else {
        withValue += 1;
        render = {
          kind: 'value',
          classIndex,
          value: observation.value,
          fill: ramp[classIndex] ?? ramp[ramp.length - 1],
        };
      }
    } else if (observation?.state === 'suppressed') {
      suppressed += 1;
      render = {
        kind: 'non-data',
        style: 'suppressed',
        reason: observation.note
          ? `Suppressed by the publisher — ${observation.note}`
          : 'Suppressed by the publisher under disclosure control',
      };
    } else if (observation?.state === 'not-applicable') {
      render = { kind: 'non-data', style: 'notApplicable', reason: 'Not applicable to this area' };
    } else {
      missing += 1;
      render = {
        kind: 'non-data',
        style: 'missing',
        reason: observation?.note
          ? `No value published — ${observation.note}`
          : 'No value published for this area and period',
      };
    }

    const comparisonIndex = comparisonAreaCodes.indexOf(area.code);
    const isSelected = area.code === selectedAreaCode;
    const selectionIndex = isSelected ? 0 : comparisonIndex >= 0 ? comparisonIndex + 1 : null;

    return {
      code: area.code,
      name: area.name,
      nation: area.nation,
      feature: area.feature,
      observation,
      render,
      // Selection changes the outline only. The fill keeps meaning what the
      // legend says it means, so an outline can never be read as a value.
      stroke:
        selectionIndex !== null
          ? SELECTION.comparisonStrokes[
              selectionIndex % SELECTION.comparisonStrokes.length
            ]
          : render.kind === 'non-data'
            ? NON_DATA_STYLES[render.style].stroke
            : '#ffffff',
      strokeWidth: selectionIndex !== null ? SELECTION.strokeWidth : 0.5,
      selectionIndex,
      isSelected,
      description: describeArea(area.name, indicator, observation, render, periodLabel),
    };
  });

  const legend: MapLegendEntry[] = [];
  if (classification) {
    classification.breaks.forEach((bin, index) => {
      const lower = formatWithUnit(bin.lower, indicator);
      const upper = formatWithUnit(bin.upper, indicator);
      legend.push({
        label: index === classification.breaks.length - 1
          ? `${lower} to ${upper}`
          : `${lower} to under ${upper}`,
        swatch: ramp[index] ?? '#cccccc',
        count: bin.count,
        kind: 'class',
        pattern: 'none',
      });
    });
  }
  if (suppressed > 0) {
    legend.push({
      label: 'Suppressed by publisher', swatch: NON_DATA_STYLES.suppressed.fill,
      count: suppressed, kind: 'non-data', pattern: 'hatch',
    });
  }
  if (missing > 0) {
    legend.push({
      label: 'No value published', swatch: NON_DATA_STYLES.missing.fill,
      count: missing, kind: 'non-data', pattern: 'none',
    });
  }
  if (outsideCoverage > 0) {
    legend.push({
      label: 'Not covered by this dataset', swatch: NON_DATA_STYLES.outsideCoverage.fill,
      count: outsideCoverage, kind: 'non-data', pattern: 'diagonal',
    });
  }

  const classificationNote = classification
    ? `${classification.methodLabel}, ${classification.classCount} classes, ` +
      `computed from the ${classification.classifiedCount} areas with a value` +
      (classification.scaleSource === 'fixed-reference'
        ? '. Scale held fixed for comparison.'
        : '.') +
      (classification.scaleNote ? ` ${classification.scaleNote}` : '')
    : 'No areas carry a value for this selection, so no colour scale is shown.';

  const coverageNote =
    outsideCoverage > 0
      ? `${outsideCoverage} area${outsideCoverage === 1 ? '' : 's'} ` +
        `outside ${indicator.coverage.nations.join(' and ')} are shown unshaded. ` +
        'They have no value in this dataset; this is a coverage gap, not a low value.'
      : null;

  return {
    areas,
    classification,
    legend,
    ramp,
    title: question,
    subtitle:
      `${indicator.name} — ${registry.areaType.label}, ${periodLabel}` +
      ` (${indicator.coverage.nations.join(', ')} coverage)`,
    unitLabel: indicator.unit ?? '',
    classificationNote,
    coverageNote,
    counts: { withValue, missing, suppressed, outsideCoverage },
  };
}
