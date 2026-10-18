import { useEffect, useState } from 'react';
import type { GeographyAvailability } from '@/data/schemas/manifest';
import type { Observation } from '@/data/schemas/observation';
import { loadSubgroupObservations } from '@/data/loader';

/** Subgroup breakdowns, fetched only when the inequality view is opened. */
export function useSubgroups(
  availability: GeographyAvailability | null,
  wanted: boolean,
): { observations: readonly Observation[]; loading: boolean; error: Error | null } {
  const [observations, setObservations] = useState<readonly Observation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const file = availability?.subgroupFile ?? null;

  useEffect(() => {
    if (!wanted || !file) {
      setObservations([]);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);

    loadSubgroupObservations(file, controller.signal)
      .then((loaded) => {
        if (!active) return;
        setObservations(loaded);
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(caught instanceof Error ? caught : new Error(String(caught)));
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [file, wanted]);

  return { observations, loading, error };
}
