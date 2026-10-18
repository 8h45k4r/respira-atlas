import { useEffect, useState } from 'react';
import type { SearchEntry } from '@/data/schemas/geography';
import type { Manifest } from '@/data/schemas/manifest';
import { loadSettlementIndex } from '@/data/loader';

/**
 * Lazily loads the settlement index the first time it is wanted.
 *
 * It is roughly fifty times the size of the area index and is only needed once
 * someone types a place name, so loading it on first paint would make the atlas
 * slower to open for everyone in order to serve one feature.
 */
export function useSettlementIndex(
  wanted: boolean,
  manifest: Manifest,
  file: string | undefined,
): { entries: readonly SearchEntry[]; loading: boolean; failed: boolean } {
  const [entries, setEntries] = useState<readonly SearchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!wanted || !file || entries.length > 0 || failed) return;
    const controller = new AbortController();
    let active = true;
    setLoading(true);

    const labels = Object.fromEntries(
      Object.values(manifest.areaTypes).map((areaType) => [areaType.key, areaType.label]),
    );

    loadSettlementIndex(file, labels, controller.signal)
      .then((loaded) => {
        if (!active) return;
        setEntries(loaded);
        setLoading(false);
      })
      .catch(() => {
        if (!active || controller.signal.aborted) return;
        // Place search degrades to areas only; the atlas stays usable.
        setFailed(true);
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [wanted, file, manifest, entries.length, failed]);

  return { entries, loading, failed };
}
