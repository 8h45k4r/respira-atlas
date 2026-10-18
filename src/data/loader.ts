import { manifestSchema, coverageSchema, indicatorSchema, type Manifest, type Coverage, type Indicator } from './schemas/manifest';
import {
  boundaryLayerSchema, searchIndexSchema, settlementIndexSchema, observationFileSchema,
  type BoundaryLayer, type SearchIndex,
} from './schemas/geography';
import type { SearchEntry } from './schemas/geography';
import { decodeObservations, DataIntegrityError } from './validation/decode';
import type { Observation } from './schemas/observation';
import { z } from 'zod';

const BASE = `${import.meta.env.BASE_URL ?? '/'}data`.replace(/\/{2,}/g, '/');

/** Bumped when the client's expectations change; invalidates any stale cache. */
export const CLIENT_CACHE_VERSION = 'v1';

export class DataLoadError extends Error {
  constructor(
    message: string,
    readonly cause_: unknown,
    readonly resource: string,
    readonly recoverable = true,
  ) {
    super(message);
    this.name = 'DataLoadError';
  }
}

/** In-memory cache. Deliberately not persisted: see note in docs/DATA.md. */
const cache = new Map<string, Promise<unknown>>();

function cacheKey(path: string) {
  return `${CLIENT_CACHE_VERSION}:${path}`;
}

/**
 * Fetches and validates one data file, caching the in-flight promise.
 *
 * The caller's `signal` deliberately does NOT cancel the underlying request. The
 * cache is shared, so aborting on behalf of one consumer would reject the
 * promise every other consumer is awaiting — and under React Strict Mode, whose
 * double-invoked effects abort immediately, that would fail every load on
 * mount. Consumers instead abandon their interest in the result (see the hooks),
 * which is what "abortable" means for a shared, cached resource. The signal is
 * still honoured before and after the request so an abandoned load does no
 * further work.
 */
async function loadJson<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const key = cacheKey(path);
  const existing = cache.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    let response: Response;
    try {
      response = await fetch(`${BASE}/${path}`);
    } catch (error) {
      throw new DataLoadError(
        `Could not reach the data file for ${path}. Check your connection and retry.`,
        error, path,
      );
    }
    if (!response.ok) {
      throw new DataLoadError(
        `The data file ${path} returned ${response.status}.`,
        null, path, response.status >= 500,
      );
    }
    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      throw new DataLoadError(`The data file ${path} is not valid JSON.`, error, path, false);
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new DataLoadError(
        `The data file ${path} does not match the expected schema. ` +
          'This build may be paired with an incompatible dataset.',
        parsed.error.issues.slice(0, 5), path, false,
      );
    }
    return parsed.data;
  })();

  // A failed load must not be cached, or a transient network error becomes permanent.
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}

export function loadManifest(signal?: AbortSignal): Promise<Manifest> {
  return loadJson('manifest.json', manifestSchema, signal);
}

export function loadCoverage(signal?: AbortSignal): Promise<Coverage> {
  return loadJson('coverage.json', coverageSchema, signal);
}

const indicatorIndexSchema = z.object({
  schemaVersion: z.number(),
  indicators: z.array(indicatorSchema),
});

export async function loadIndicators(signal?: AbortSignal): Promise<Indicator[]> {
  const index = await loadJson('indicators/index.json', indicatorIndexSchema, signal);
  return index.indicators;
}

export function loadBoundaryLayer(file: string, signal?: AbortSignal): Promise<BoundaryLayer> {
  return loadJson(file, boundaryLayerSchema, signal);
}

export function loadSearchIndex(signal?: AbortSignal): Promise<SearchIndex> {
  return loadJson('search/areas.json', searchIndexSchema, signal);
}

function nationOf(code: string): string {
  if (/^E/.test(code)) return 'England';
  if (/^W/.test(code)) return 'Wales';
  if (/^S/.test(code)) return 'Scotland';
  if (/^N/.test(code)) return 'Northern Ireland';
  return 'Unknown';
}

/**
 * Settlements, fetched on demand.
 *
 * Each entry keeps its containing area explicitly, so a settlement is never
 * silently treated as equivalent to the administrative area it sits in.
 */
export async function loadSettlementIndex(
  file: string,
  areaTypeLabels: Readonly<Record<string, string>>,
  signal?: AbortSignal,
): Promise<SearchEntry[]> {
  const raw = await loadJson(file, settlementIndexSchema, signal);
  return raw.entries.map((entry) => ({
    kind: 'settlement' as const,
    code: entry.c,
    name: entry.n,
    nation: nationOf(entry.bc),
    areaTypeKey: entry.k,
    areaTypeId: null,
    areaTypeLabel: areaTypeLabels[entry.k] ?? entry.k,
    mode: entry.m,
    containedBy: { code: entry.bc, name: entry.bn, areaTypeKey: entry.k },
  }));
}

export interface ObservationSet {
  readonly indicatorId: number;
  readonly areaTypeKey: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly periods: readonly string[];
  readonly periodRangeByPeriod: Readonly<Record<string, string>>;
  readonly periodSeries: readonly {
    range: string; years: number; pooled: boolean; label: string;
    description: string; periods: string[]; latestPeriod: string | null; periodCount: number;
  }[];
  readonly defaultPeriodSeries: string;
  readonly sex: string;
  readonly age: string;
  readonly observations: readonly Observation[];
  readonly benchmark: {
    readonly areaCode: string;
    readonly label: string;
    readonly observations: readonly Observation[];
  };
  /** areaCode -> period -> observation */
  readonly byArea: ReadonlyMap<string, ReadonlyMap<string, Observation>>;
  readonly benchmarkByPeriod: ReadonlyMap<string, Observation>;
}

function indexByAreaAndPeriod(observations: readonly Observation[]) {
  const map = new Map<string, Map<string, Observation>>();
  for (const o of observations) {
    let periods = map.get(o.areaCode);
    if (!periods) { periods = new Map(); map.set(o.areaCode, periods); }
    periods.set(o.period, o);
  }
  return map;
}

export async function loadObservations(
  file: string,
  signal?: AbortSignal,
): Promise<ObservationSet> {
  const raw = await loadJson(file, observationFileSchema, signal);
  let observations: Observation[];
  let benchmark: Observation[];
  try {
    observations = decodeObservations(raw.data);
    benchmark = decodeObservations(raw.benchmark.data);
  } catch (error) {
    if (error instanceof DataIntegrityError) {
      throw new DataLoadError(
        `Observations in ${file} could not be decoded: ${error.message}`,
        error.detail, file, false,
      );
    }
    throw error;
  }
  return {
    indicatorId: raw.indicatorId,
    areaTypeKey: raw.areaTypeKey,
    sourceUrl: raw.sourceUrl,
    retrievedAt: raw.retrievedAt,
    periods: raw.periods,
    periodRangeByPeriod: raw.periodRangeByPeriod,
    periodSeries: raw.periodSeries,
    defaultPeriodSeries: raw.defaultPeriodSeries,
    sex: raw.sex,
    age: raw.age,
    observations,
    benchmark: {
      areaCode: raw.benchmark.areaCode,
      label: raw.benchmark.label,
      observations: benchmark,
    },
    byArea: indexByAreaAndPeriod(observations),
    benchmarkByPeriod: new Map(benchmark.map((o) => [o.period, o])),
  };
}

export async function loadSubgroupObservations(
  file: string,
  signal?: AbortSignal,
): Promise<readonly Observation[]> {
  const schema = z.object({ data: z.unknown() });
  const raw = await loadJson(file, schema, signal);
  try {
    return decodeObservations(raw.data);
  } catch (error) {
    throw new DataLoadError(
      `Subgroup observations in ${file} could not be decoded.`, error, file, false,
    );
  }
}

export function clearDataCache() {
  cache.clear();
}
