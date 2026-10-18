import { useCallback, useEffect, useState } from 'react';
import {
  deserialiseState, serialiseState, type AtlasState,
} from '@/state/atlas-state';

/**
 * Keeps analytical state in the URL.
 *
 * Changes replace the history entry rather than pushing one, so adjusting a
 * filter does not fill the back button with intermediate states; the Back
 * control in the interface moves up the geography instead. Browser
 * back/forward still works across genuinely different views.
 */
export function useUrlState(): [AtlasState, (next: Partial<AtlasState>) => void, (next: AtlasState) => void] {
  const [state, setState] = useState<AtlasState>(() =>
    deserialiseState(window.location.search.replace(/^\?/, '')),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(deserialiseState(window.location.search.replace(/^\?/, '')));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const write = useCallback((next: AtlasState) => {
    setState(next);
    const query = serialiseState(next);
    const url = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, []);

  const patch = useCallback(
    (partial: Partial<AtlasState>) => {
      setState((current) => {
        const next = { ...current, ...partial };
        const query = serialiseState(next);
        window.history.replaceState(
          null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname,
        );
        return next;
      });
    },
    [],
  );

  return [state, patch, write];
}
