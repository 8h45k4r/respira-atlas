import type { ClassificationMethod } from '@/data/selectors/classification';
import type { GeographyMode } from '@/geography/model';

export type AtlasMode =
  | 'discover' | 'explore' | 'stories' | 'explain' | 'briefing' | 'methods' | 'coverage';

/**
 * The complete analytical state. Everything that changes what a reader sees is
 * here, so a URL reproduces a figure exactly — which is what makes a finding
 * checkable by someone else.
 */
export interface AtlasState {
  readonly mode: AtlasMode;
  /** Topic grouping for indicator selection. */
  readonly topic: string | null;
  readonly geographyMode: GeographyMode;
  readonly areaTypeKey: string | null;
  readonly indicatorId: number | null;
  /**
   * Recorded sex category as the publisher labels it. Null means "use the
   * published combined series", which does not exist for every measure — see
   * `requiresSexChoice` in the capability metadata.
   */
  readonly sex: string | null;
  readonly period: string | null;
  /** Period series range key ('1y', '3y'); pooled and single-year never mix. */
  readonly periodSeries: string | null;
  readonly selectedAreaCode: string | null;
  /** Up to four areas, compared only when compatible. */
  readonly comparisonAreaCodes: readonly string[];
  readonly classification: ClassificationMethod;
  readonly classCount: number;
  /** Holds the colour scale fixed when comparing periods. */
  readonly lockScale: boolean;
  readonly nationFocus: string | null;
  /** Second indicator for the exposure/outcome scatter. */
  readonly scatterIndicatorId: number | null;
  /** Comparison period for change views. Must be in the same period series. */
  readonly comparePeriod: string | null;
  readonly subgroupCategoryType: string | null;
}

export const DEFAULT_STATE: AtlasState = {
  mode: 'explore',
  topic: null,
  geographyMode: 'administrative',
  areaTypeKey: null,
  indicatorId: null,
  sex: null,
  period: null,
  periodSeries: null,
  selectedAreaCode: null,
  comparisonAreaCodes: [],
  classification: 'quantile',
  classCount: 5,
  lockScale: false,
  nationFocus: null,
  scatterIndicatorId: null,
  comparePeriod: null,
  subgroupCategoryType: null,
};

export const MAX_COMPARISON_AREAS = 4;

const KEYS = {
  mode: 'v',
  topic: 't',
  geographyMode: 'g',
  areaTypeKey: 'l',
  indicatorId: 'i',
  sex: 'sx',
  period: 'p',
  periodSeries: 'ps',
  selectedAreaCode: 'a',
  comparisonAreaCodes: 'c',
  classification: 'cm',
  classCount: 'cn',
  lockScale: 'lk',
  nationFocus: 'n',
  scatterIndicatorId: 'x',
  comparePeriod: 'p2',
  subgroupCategoryType: 'sg',
} as const;

const MODES: readonly AtlasMode[] = [
  'discover', 'explore', 'stories', 'explain', 'briefing', 'methods', 'coverage',
];
const GEOGRAPHY_MODES: readonly GeographyMode[] = ['administrative', 'nhs'];
const CLASSIFICATIONS: readonly ClassificationMethod[] = [
  'quantile', 'equal-interval', 'fixed',
];

export function serialiseState(state: AtlasState): string {
  const params = new URLSearchParams();
  const put = (key: string, value: string | null | undefined) => {
    if (value !== null && value !== undefined && value !== '') params.set(key, value);
  };

  if (state.mode !== DEFAULT_STATE.mode) put(KEYS.mode, state.mode);
  put(KEYS.topic, state.topic);
  if (state.geographyMode !== DEFAULT_STATE.geographyMode) {
    put(KEYS.geographyMode, state.geographyMode);
  }
  put(KEYS.areaTypeKey, state.areaTypeKey);
  put(KEYS.indicatorId, state.indicatorId?.toString());
  put(KEYS.sex, state.sex);
  put(KEYS.period, state.period);
  put(KEYS.periodSeries, state.periodSeries);
  put(KEYS.selectedAreaCode, state.selectedAreaCode);
  if (state.comparisonAreaCodes.length > 0) {
    put(KEYS.comparisonAreaCodes, state.comparisonAreaCodes.join(','));
  }
  if (state.classification !== DEFAULT_STATE.classification) {
    put(KEYS.classification, state.classification);
  }
  if (state.classCount !== DEFAULT_STATE.classCount) {
    put(KEYS.classCount, String(state.classCount));
  }
  if (state.lockScale) put(KEYS.lockScale, '1');
  put(KEYS.nationFocus, state.nationFocus);
  put(KEYS.scatterIndicatorId, state.scatterIndicatorId?.toString());
  put(KEYS.comparePeriod, state.comparePeriod);
  put(KEYS.subgroupCategoryType, state.subgroupCategoryType);

  return params.toString();
}

/**
 * Parses a URL query into state, discarding anything invalid rather than
 * throwing. A shared link that has drifted should degrade to a usable view,
 * not a blank screen — but it must never silently invent a selection.
 */
export function deserialiseState(query: string): AtlasState {
  const params = new URLSearchParams(query);
  const str = (key: string): string | null => {
    const value = params.get(key);
    return value && value.trim() !== '' ? value.trim() : null;
  };
  const int = (key: string): number | null => {
    const value = str(key);
    if (value === null) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  };
  const oneOf = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const value = str(key);
    return value !== null && (allowed as readonly string[]).includes(value)
      ? (value as T)
      : fallback;
  };

  const comparisonRaw = str(KEYS.comparisonAreaCodes);
  const comparisonAreaCodes = comparisonRaw
    ? [...new Set(
        comparisonRaw
          .split(',')
          .map((code) => code.trim().toUpperCase())
          // ONS codes are a letter then eight digits; anything else is not a code.
          .filter((code) => /^[ENSWK]\d{8}$/.test(code)),
      )].slice(0, MAX_COMPARISON_AREAS)
    : [];

  const classCount = int(KEYS.classCount);
  const selected = str(KEYS.selectedAreaCode)?.toUpperCase() ?? null;

  return {
    /*
     * A bare URL lands on discovery; a URL that already carries analytical
     * state opens the workspace directly. Links shared before discovery existed
     * name an indicator, area or topic, so they keep resolving to the view
     * their author meant.
     */
    mode: oneOf(
      KEYS.mode,
      MODES,
      params.has(KEYS.indicatorId) ||
        params.has(KEYS.selectedAreaCode) ||
        params.has(KEYS.topic) ||
        params.has(KEYS.comparisonAreaCodes)
        ? 'explore'
        : 'discover',
    ),
    topic: str(KEYS.topic),
    geographyMode: oneOf(KEYS.geographyMode, GEOGRAPHY_MODES, DEFAULT_STATE.geographyMode),
    areaTypeKey: str(KEYS.areaTypeKey),
    indicatorId: int(KEYS.indicatorId),
    sex: str(KEYS.sex),
    period: str(KEYS.period),
    periodSeries: str(KEYS.periodSeries),
    selectedAreaCode: selected && /^[ENSWK]\d{8}$/.test(selected) ? selected : null,
    comparisonAreaCodes,
    classification: oneOf(KEYS.classification, CLASSIFICATIONS, DEFAULT_STATE.classification),
    classCount:
      classCount !== null && classCount >= 2 && classCount <= 9
        ? classCount
        : DEFAULT_STATE.classCount,
    lockScale: str(KEYS.lockScale) === '1',
    nationFocus: str(KEYS.nationFocus),
    scatterIndicatorId: int(KEYS.scatterIndicatorId),
    comparePeriod: str(KEYS.comparePeriod),
    subgroupCategoryType: str(KEYS.subgroupCategoryType),
  };
}

export function stateToUrl(state: AtlasState, origin = window.location.origin): string {
  const query = serialiseState(state);
  const base = `${origin}${window.location.pathname}`;
  return query ? `${base}?${query}` : base;
}
