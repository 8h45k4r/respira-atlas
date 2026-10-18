import { useEffect, useState } from 'react';
import type { GeographyAvailability } from '@/data/schemas/manifest';
import { loadObservations, type ObservationSet } from '@/data/loader';
import type { AsyncResource } from './useAtlasCatalogue';

/** Loads one indicator's observations for one geography, abortable. */
export function useObservations(
  availability: GeographyAvailability | null,
): AsyncResource<ObservationSet> | null {
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState<AsyncResource<ObservationSet> | null>(null);
  const file = availability?.file ?? null;

  useEffect(() => {
    if (!file) {
      setResource(null);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setResource({ status: 'loading' });

    loadObservations(file, controller.signal)
      .then((value) => {
        if (!active) return;
        setResource({ status: 'ready', value });
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
  }, [file, attempt]);

  return resource;
}
