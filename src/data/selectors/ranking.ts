import type { Observation, PresentObservation } from '@/data/schemas/observation';
import { isPresent } from '@/data/schemas/observation';

/**
 * Ordering areas by value.
 *
 * Rank 1 is the highest value, whatever the measure's polarity: a rank here is a
 * position in the distribution, never a performance placing. Ties share a rank
 * (standard competition ranking, "1, 2, 2, 4"), because two areas with the same
 * published value cannot be put in order.
 */
export interface RankedEntry {
  readonly observation: PresentObservation;
  readonly rank: number;
}

export function rankByValue(observations: readonly Observation[]): RankedEntry[] {
  const present = observations.filter(isPresent);
  const sorted = [...present].sort(
    (a, b) => b.value - a.value || a.areaCode.localeCompare(b.areaCode),
  );
  const ranked: RankedEntry[] = [];
  sorted.forEach((observation, index) => {
    const previous = ranked[index - 1];
    const rank =
      previous && previous.observation.value === observation.value ? previous.rank : index + 1;
    ranked.push({ observation, rank });
  });
  return ranked;
}

export function rankLookup(ranked: readonly RankedEntry[]): Map<string, number> {
  return new Map(ranked.map((entry) => [entry.observation.areaCode, entry.rank]));
}

/**
 * An area and its nearest neighbours in value: `radius` above and `radius`
 * below, shifted at the ends of the distribution so the window keeps its size.
 * Returns null when the area has no value to rank.
 */
export function rankWindow(
  ranked: readonly RankedEntry[],
  areaCode: string,
  radius = 5,
): RankedEntry[] | null {
  const index = ranked.findIndex((entry) => entry.observation.areaCode === areaCode);
  if (index < 0) return null;
  const size = Math.min(ranked.length, radius * 2 + 1);
  const start = Math.max(0, Math.min(index - radius, ranked.length - size));
  return ranked.slice(start, start + size);
}

/** The `perEnd` highest and `perEnd` lowest values, in rank order. */
export function rankExtremes(ranked: readonly RankedEntry[], perEnd = 7): RankedEntry[] {
  if (ranked.length <= perEnd * 2) return [...ranked];
  return [...ranked.slice(0, perEnd), ...ranked.slice(-perEnd)];
}
