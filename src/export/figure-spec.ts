import type { MapViewModel } from '@/charts/map-view-model';
import type { EvidenceStatement } from '@/data/selectors/evidence';
import type { Classification } from '@/data/selectors/classification';
import type { AtlasState } from '@/state/atlas-state';

export type FigureComposition =
  | 'plot-only'
  | 'figure'
  | 'presentation'
  | 'a4-brief';

export interface TextScale {
  readonly title: number;
  readonly body: number;
  readonly small: number;
}

export const TEXT_SCALES: Record<'compact' | 'standard' | 'large', TextScale> = {
  compact: { title: 14, body: 10.5, small: 9 },
  standard: { title: 17, body: 12, small: 10 },
  large: { title: 21, body: 14.5, small: 12 },
};

export interface MandatoryNotes {
  readonly indicator: string;
  readonly indicatorId: number;
  readonly geography: string;
  readonly boundaryVintage: string | null;
  readonly population: string;
  readonly period: string;
  readonly benchmark: string;
  readonly unit: string;
  readonly measureType: string;
  readonly classification: string;
  readonly source: string;
  readonly publisher: string;
  readonly licence: string;
  readonly retrievedAt: string;
  readonly limitation: string;
  readonly dataVersion: string;
  readonly attribution: string;
}

export interface FigureSpec {
  readonly specVersion: 1;
  readonly generatedAt: string;
  readonly composition: FigureComposition;
  readonly textScale: 'compact' | 'standard' | 'large';
  /** Author-edited headline, always labelled as user-authored on the figure. */
  readonly headline: string | null;
  readonly headlineIsUserAuthored: boolean;
  readonly question: string;
  readonly state: AtlasState;
  readonly shareUrl: string;
  readonly notes: MandatoryNotes;
  readonly classification: {
    readonly method: string;
    readonly classCount: number;
    readonly boundaries: readonly number[];
    readonly min: number;
    readonly max: number;
    readonly scaleSource: string;
  } | null;
  readonly evidence: {
    readonly observed: string;
    readonly comparison: string | null;
    readonly uncertainty: string;
    readonly limitations: readonly string[];
    readonly furtherEvidence: readonly string[];
  } | null;
  readonly areas: readonly {
    readonly code: string;
    readonly name: string;
    readonly state: string;
    readonly value: number | null;
    readonly lowerCi95: number | null;
    readonly upperCi95: number | null;
  }[];
}

export interface BuildFigureSpecInput {
  readonly composition: FigureComposition;
  readonly textScale: 'compact' | 'standard' | 'large';
  readonly headline: string | null;
  readonly question: string;
  readonly state: AtlasState;
  readonly shareUrl: string;
  readonly notes: MandatoryNotes;
  readonly classification: Classification | null;
  readonly evidence: EvidenceStatement | null;
  readonly viewModel: MapViewModel | null;
}

/**
 * A downloadable, self-describing record of exactly what was rendered.
 *
 * The point is reproducibility: a reviewer can read the spec and reconstruct the
 * figure, including the class breaks and the mandatory notes, without having to
 * reconstruct the analysis from the source data.
 */
export function buildFigureSpec(input: BuildFigureSpecInput): FigureSpec {
  return {
    specVersion: 1,
    generatedAt: new Date().toISOString(),
    composition: input.composition,
    textScale: input.textScale,
    headline: input.headline,
    headlineIsUserAuthored: input.headline !== null && input.headline.trim() !== '',
    question: input.question,
    state: input.state,
    shareUrl: input.shareUrl,
    notes: input.notes,
    classification: input.classification
      ? {
          method: input.classification.methodLabel,
          classCount: input.classification.classCount,
          boundaries: input.classification.boundaries,
          min: input.classification.min,
          max: input.classification.max,
          scaleSource: input.classification.scaleSource,
        }
      : null,
    evidence: input.evidence
      ? {
          observed: input.evidence.observed,
          comparison: input.evidence.comparison,
          uncertainty: input.evidence.uncertainty,
          limitations: input.evidence.limitations,
          furtherEvidence: input.evidence.furtherEvidence,
        }
      : null,
    areas:
      input.viewModel?.areas.map((area) => ({
        code: area.code,
        name: area.name,
        state: area.observation?.state ?? 'no-observation',
        value: area.render.kind === 'value' ? area.render.value : null,
        lowerCi95:
          area.observation?.state === 'present' ? area.observation.lowerCi95 : null,
        upperCi95:
          area.observation?.state === 'present' ? area.observation.upperCi95 : null,
      })) ?? [],
  };
}

/** Lines that must appear on every exported figure. */
export function mandatoryNoteLines(notes: MandatoryNotes): string[] {
  return [
    `Indicator: ${notes.indicator} (Fingertips indicator ${notes.indicatorId}).`,
    `Measure: ${notes.measureType}, ${notes.unit}. Population: ${notes.population}.`,
    `Geography: ${notes.geography}` +
      (notes.boundaryVintage ? `, boundaries ${notes.boundaryVintage}.` : '.'),
    `Period: ${notes.period}. Benchmark: ${notes.benchmark}.`,
    `Classification: ${notes.classification}`,
    `Source: ${notes.source}. Published by ${notes.publisher}. Retrieved ${notes.retrievedAt}.`,
    `Licence: ${notes.licence}. ${notes.attribution}`,
    `Limitation: ${notes.limitation}`,
    `Data version: ${notes.dataVersion}.`,
  ];
}
