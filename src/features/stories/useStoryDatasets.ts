import { useEffect, useState } from 'react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import { loadBoundaryLayer, loadObservations } from '@/data/loader';
import { AreaRegistry } from '@/geography/model';
import type { StorySpec, LoadedDataset } from './types';

export type StoryDataState =
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'ready'; datasets: Readonly<Record<string, LoadedDataset>> }
  /** The release no longer contains what the story needs. */
  | { status: 'unsupported'; reason: string };

/**
 * Loads everything one story needs.
 *
 * A story names the indicators and geographies it works on; if the release has
 * since dropped one of them, this reports `unsupported` with the reason rather
 * than rendering a story around a hole. Boundary layers are shared through the
 * loader's cache, so several stories on the same geography fetch it once.
 */
export function useStoryDatasets(
  catalogue: Catalogue,
  spec: StorySpec | null,
): StoryDataState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<StoryDataState>({ status: 'loading' });

  useEffect(() => {
    if (!spec) return;
    const controller = new AbortController();
    let active = true;
    setState({ status: 'loading' });

    (async () => {
      try {
        const datasets: Record<string, LoadedDataset> = {};

        for (const requirement of spec.requires) {
          const indicator = catalogue.indicators.find(
            (candidate) => candidate.id === requirement.indicatorId,
          );
          if (!indicator) {
            if (active) {
              setState({
                status: 'unsupported',
                reason:
                  `Indicator ${requirement.indicatorId} is not published in this release, ` +
                  'so this story cannot be built.',
              });
            }
            return;
          }
          const availability = indicator.geographies[requirement.areaTypeKey];
          const areaType = catalogue.manifest.areaTypes[requirement.areaTypeKey];
          if (!availability || !areaType) {
            if (active) {
              setState({
                status: 'unsupported',
                reason:
                  `${indicator.name} is no longer published for ` +
                  `${areaType?.label ?? requirement.areaTypeKey}, so this story cannot be built.`,
              });
            }
            return;
          }

          const [layer, observations] = await Promise.all([
            loadBoundaryLayer(areaType.file, controller.signal),
            loadObservations(availability.file, controller.signal),
          ]);

          const series =
            observations.periodSeries.find(
              (candidate) => candidate.range === observations.defaultPeriodSeries,
            ) ?? observations.periodSeries[0];
          const period = series.latestPeriod ?? series.periods[series.periods.length - 1];
          const sex =
            observations.defaultSex ?? observations.primarySexes[0] ?? '';

          datasets[requirement.as] = {
            indicator,
            areaType,
            observations,
            registry: new AreaRegistry(areaType, layer),
            period,
            periodLabel: series.pooled ? `${period} (${series.label.toLowerCase()})` : period,
            pooledYears: series.years,
            sex,
            current: observations.observations.filter(
              (observation) => observation.period === period && observation.sex === sex,
            ),
          };
        }

        if (!active) return;
        setState({ status: 'ready', datasets });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setState({
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
  }, [catalogue, spec, attempt]);

  return state;
}
