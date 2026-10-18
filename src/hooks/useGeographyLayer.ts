import { useEffect, useState } from 'react';
import type { AreaTypeMeta } from '@/data/schemas/manifest';
import { loadBoundaryLayer } from '@/data/loader';
import { AreaRegistry } from '@/geography/model';
import type { AsyncResource } from './useAtlasCatalogue';

/**
 * Loads one boundary layer on demand and wraps it in a registry.
 *
 * Layers are fetched lazily, so opening the atlas does not download every
 * geography; switching mode or level fetches only what the new view needs. An
 * in-flight request is aborted when the selection changes again.
 */
export function useGeographyLayer(
  areaType: AreaTypeMeta | null,
): AsyncResource<AreaRegistry> | null {
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState<AsyncResource<AreaRegistry> | null>(null);

  useEffect(() => {
    if (!areaType) {
      setResource(null);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setResource({ status: 'loading' });

    loadBoundaryLayer(areaType.file, controller.signal)
      .then((layer) => {
        if (!active) return;
        setResource({ status: 'ready', value: new AreaRegistry(areaType, layer) });
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        setResource({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
          retry: () => setAttempt((n) => n + 1),
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [areaType, attempt]);

  return resource;
}
