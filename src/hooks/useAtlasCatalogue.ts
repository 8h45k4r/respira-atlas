import { useEffect, useState } from 'react';
import type { Manifest, Indicator, Coverage } from '@/data/schemas/manifest';
import type { SearchIndex } from '@/data/schemas/geography';
import {
  loadManifest, loadIndicators, loadCoverage, loadSearchIndex, DataLoadError,
} from '@/data/loader';

export interface Catalogue {
  readonly manifest: Manifest;
  readonly indicators: readonly Indicator[];
  readonly coverage: Coverage;
  readonly search: SearchIndex;
}

export type AsyncResource<T> =
  | { status: 'loading' }
  | { status: 'error'; error: DataLoadError | Error; retry: () => void }
  | { status: 'ready'; value: T };

/** Loads the catalogue once. Every failure is recoverable by retrying. */
export function useAtlasCatalogue(): AsyncResource<Catalogue> {
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState<AsyncResource<Catalogue>>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResource({ status: 'loading' });

    (async () => {
      try {
        const [manifest, indicators, coverage, search] = await Promise.all([
          loadManifest(controller.signal),
          loadIndicators(controller.signal),
          loadCoverage(controller.signal),
          loadSearchIndex(controller.signal),
        ]);
        if (!active) return;
        setResource({
          status: 'ready',
          value: { manifest, indicators, coverage, search },
        });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setResource({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
          retry: () => setAttempt((n) => n + 1),
        });
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  return resource;
}
