import type { Indicator, Manifest, AreaTypeMeta } from '@/data/schemas/manifest';
import type { Observation } from '@/data/schemas/observation';
import type { ObservationSet } from '@/data/loader';
import type { AreaRegistry } from '@/geography/model';
import type { AtlasState } from '@/state/atlas-state';

/** One indicator at one geography that a story needs in order to run. */
export interface StoryRequirement {
  readonly indicatorId: number;
  readonly areaTypeKey: string;
  /** Names the role this dataset plays, so build() can read it clearly. */
  readonly as: string;
}

export interface LoadedDataset {
  readonly indicator: Indicator;
  readonly areaType: AreaTypeMeta;
  readonly observations: ObservationSet;
  readonly registry: AreaRegistry;
  /** The period this story works in: the latest in the default series. */
  readonly period: string;
  readonly periodLabel: string;
  readonly pooledYears: number;
  readonly sex: string;
  /** Observations for the working period and population, all states included. */
  readonly current: readonly Observation[];
}

export interface StoryContext {
  readonly manifest: Manifest;
  readonly datasets: Readonly<Record<string, LoadedDataset>>;
  readonly areaName: (code: string) => string;
}

export type StoryFigure =
  | { kind: 'map'; dataset: string; caption: string }
  | { kind: 'dot-whisker'; dataset: string; areaCodes: readonly string[]; caption: string }
  | { kind: 'scatter'; xDataset: string; yDataset: string; period: string; caption: string }
  | { kind: 'groups'; dataset: string; areaCode: string; caption: string };

export interface StoryStep {
  readonly heading: string;
  /** Computed from the data. Never authored with numbers in it. */
  readonly body: string;
  readonly figure?: StoryFigure;
  /** A caveat that belongs with this specific step. */
  readonly note?: string;
}

export interface StoryContent {
  readonly setup: {
    readonly measure: string;
    readonly population: string;
    readonly place: string;
    readonly period: string;
    readonly source: string;
  };
  readonly steps: readonly StoryStep[];
  readonly cannotConclude: readonly string[];
  readonly furtherQuestions: readonly string[];
  /** Opens the exact analytical view this story is built on. */
  readonly liveView: Partial<AtlasState>;
}

/** Returned when the data no longer support the story. */
export interface StoryUnavailable {
  readonly unavailable: true;
  readonly reason: string;
}

export function isUnavailable(
  result: StoryContent | StoryUnavailable,
): result is StoryUnavailable {
  return (result as StoryUnavailable).unavailable === true;
}

export interface StorySpec {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  readonly standfirst: string;
  /** The methodological point the story exists to make. */
  readonly teaches: string;
  readonly requires: readonly StoryRequirement[];
  readonly build: (context: StoryContext) => StoryContent | StoryUnavailable;
}
