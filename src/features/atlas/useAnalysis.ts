import { useMemo } from 'react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import type { AreaRegistry } from '@/geography/model';
import type { ObservationSet } from '@/data/loader';
import type { Indicator, GeographyAvailability, AreaTypeMeta } from '@/data/schemas/manifest';
import type { Observation } from '@/data/schemas/observation';
import { classify } from '@/data/selectors/classification';
import { buildMapViewModel, type MapViewModel } from '@/charts/map-view-model';
import { buildEvidenceStatement, type EvidenceStatement, type EvidenceContext } from '@/data/selectors/evidence';
import { measureTypeLabel } from '@/data/selectors/format';
import type { MandatoryNotes } from '@/export/figure-spec';

export interface ResolvedSelection {
  readonly indicator: Indicator;
  readonly areaType: AreaTypeMeta;
  readonly availability: GeographyAvailability;
  readonly period: string;
  readonly periodSeries: {
    range: string; years: number; pooled: boolean; label: string;
    description: string; periods: string[]; latestPeriod: string | null; periodCount: number;
  };
}

/**
 * Resolves the possibly-stale URL state against what the data actually contain.
 *
 * A shared link may name an indicator that is not published at the geography it
 * also names, or a period that no longer exists. Rather than rendering nothing,
 * each field falls back to a valid value — but only ever to one that exists in
 * the data, never to an invented default.
 */
export function resolveSelection(
  catalogue: Catalogue,
  state: AtlasState,
): { resolved: ResolvedSelection | null; corrections: string[] } {
  const corrections: string[] = [];
  const { manifest, indicators } = catalogue;

  const areaTypesInMode = Object.values(manifest.areaTypes).filter(
    (areaType) => areaType.mode === state.geographyMode,
  );
  if (areaTypesInMode.length === 0) return { resolved: null, corrections };

  let areaType =
    areaTypesInMode.find((candidate) => candidate.key === state.areaTypeKey) ??
    areaTypesInMode[0];
  if (state.areaTypeKey && areaType.key !== state.areaTypeKey) {
    corrections.push(
      `Geography level “${state.areaTypeKey}” is not available in ${state.geographyMode} ` +
        `mode; showing ${areaType.label}.`,
    );
  }

  const requested = indicators.find((candidate) => candidate.id === state.indicatorId);
  let indicator = requested;

  // The indicator must actually be published at this level.
  if (indicator && !indicator.geographies[areaType.key]) {
    const alternative = areaTypesInMode.find((candidate) => indicator!.geographies[candidate.key]);
    if (alternative) {
      corrections.push(
        `${indicator.name} is not published for ${areaType.label}; showing ` +
          `${alternative.label}, where it is available.`,
      );
      areaType = alternative;
    } else {
      corrections.push(
        `${indicator.name} is not published at any geography in ` +
          `${state.geographyMode} mode.`,
      );
      indicator = undefined;
    }
  }

  if (!indicator) {
    indicator = indicators.find((candidate) => candidate.geographies[areaType.key]);
  }
  if (!indicator) return { resolved: null, corrections };

  const availability = indicator.geographies[areaType.key];
  if (!availability) return { resolved: null, corrections };

  return {
    resolved: {
      indicator,
      areaType,
      availability,
      // Period and series are resolved against the observation file, which is
      // the only place the actual period lists live.
      period: state.period ?? availability.latestPeriod ?? '',
      periodSeries: {
        range: state.periodSeries ?? availability.defaultPeriodSeries,
        years: 1, pooled: false, label: '', description: '',
        periods: [], latestPeriod: null, periodCount: 0,
      },
    },
    corrections,
  };
}

export interface Analysis {
  readonly viewModel: MapViewModel;
  readonly observationsForPeriod: readonly Observation[];
  readonly selectedObservation: Observation | undefined;
  readonly benchmarkObservation: Observation | undefined;
  readonly evidence: EvidenceStatement | null;
  readonly notes: MandatoryNotes;
  readonly period: string;
  readonly sex: string;
  readonly availableSexes: readonly string[];
  readonly requiresSexChoice: boolean;
  readonly periodSeries: ObservationSet['periodSeries'][number];
  readonly availablePeriods: readonly string[];
  readonly question: string;
  readonly corrections: readonly string[];
}

/** The question a map of this indicator at this geography answers. */
export function buildQuestion(indicator: Indicator, areaTypeLabel: string): string {
  const measure = (indicator.shortName || indicator.name).replace(/\s*\(.*?\)\s*$/, '');
  return `How does ${measure.charAt(0).toLowerCase()}${measure.slice(1)} vary across ${
    areaTypeLabel.toLowerCase()
  }?`;
}

export function useAnalysis({
  catalogue, state, selection, registry, observations,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  selection: ResolvedSelection;
  registry: AreaRegistry;
  observations: ObservationSet;
}): Analysis {
  return useMemo(() => {
    const { indicator, areaType } = selection;
    const corrections: string[] = [];

    // Resolve the period series against the file, then the period within it.
    const series =
      observations.periodSeries.find((candidate) => candidate.range === state.periodSeries) ??
      observations.periodSeries.find(
        (candidate) => candidate.range === observations.defaultPeriodSeries,
      ) ??
      observations.periodSeries[0];

    if (state.periodSeries && series.range !== state.periodSeries) {
      corrections.push(
        `Period series “${state.periodSeries}” is not published for this selection; ` +
          `showing the ${series.label.toLowerCase()} series.`,
      );
    }

    let period = state.period ?? series.latestPeriod ?? series.periods[0];
    if (!series.periods.includes(period)) {
      const fallback = series.latestPeriod ?? series.periods[series.periods.length - 1];
      if (state.period) {
        corrections.push(
          `Period “${state.period}” is not in the ${series.label.toLowerCase()} series; ` +
            `showing ${fallback}.`,
        );
      }
      period = fallback;
    }

    /*
     * Resolve the population series.
     *
     * Most measures publish a combined series and `defaultSex` names it. Some —
     * life expectancy being the standard case — are published only by sex, and
     * there is no combined figure to fall back on. Rather than silently picking
     * one, the resolved choice is reported back so the interface can say which
     * population is on screen and why.
     */
    const availableSexes = observations.primarySexes;
    let sex = state.sex ?? observations.defaultSex ?? availableSexes[0] ?? '';
    if (!availableSexes.includes(sex)) {
      const fallback = observations.defaultSex ?? availableSexes[0] ?? '';
      if (state.sex) {
        corrections.push(
          `“${state.sex}” is not published for this measure at this geography; ` +
            `showing ${fallback}.`,
        );
      }
      sex = fallback;
    }
    if (observations.requiresSexChoice && !state.sex) {
      corrections.push(
        `${indicator.shortName} is published separately for ${availableSexes.join(' and ')} ` +
          `with no combined figure. Showing ${sex}; change the population to see the other.`,
      );
    }

    const observationsForPeriod = observations.observations.filter(
      (observation) => observation.period === period && observation.sex === sex,
    );
    const byArea = new Map(
      observationsForPeriod.map((observation) => [observation.areaCode, observation]),
    );

    // When the scale is locked, breaks come from the whole series rather than
    // this period, so moving through time cannot silently recolour the map.
    const classification = state.lockScale
      ? classify(
          observations.observations.filter(
            (o) => series.periods.includes(o.period) && o.sex === sex,
          ),
          { method: state.classification, classCount: state.classCount },
        )
      : classify(observationsForPeriod, {
          method: state.classification,
          classCount: state.classCount,
        });

    const lockedClassification =
      state.lockScale && classification
        ? classify(observationsForPeriod, {
            fixedBoundaries: classification.boundaries,
            fixedScaleNote:
              `Class breaks are fixed across all ${series.periodCount} periods in the ` +
              `${series.label.toLowerCase()} series, so colours are comparable between periods.`,
          })
        : classification;

    const question = buildQuestion(indicator, areaType.label);

    const viewModel = buildMapViewModel({
      indicator,
      manifest: catalogue.manifest,
      registry,
      observationsByArea: byArea,
      classification: lockedClassification,
      period,
      periodLabel: period,
      selectedAreaCode: state.selectedAreaCode,
      comparisonAreaCodes: state.comparisonAreaCodes,
      question,
    });

    const selectedObservation = state.selectedAreaCode
      ? byArea.get(state.selectedAreaCode)
      : undefined;
    const benchmarkObservation = observations.benchmark.observations.find(
      (o) => o.period === period && o.sex === sex,
    );

    const selectedArea = state.selectedAreaCode
      ? registry.get(state.selectedAreaCode)
      : undefined;

    // The previous period must come from the same series, or no change is shown.
    const seriesIndex = series.periods.indexOf(period);
    const previousPeriod = seriesIndex > 0 ? series.periods[seriesIndex - 1] : undefined;
    const previousObservation =
      previousPeriod && state.selectedAreaCode
        ? observations.observations.find(
            (o) =>
              o.areaCode === state.selectedAreaCode &&
              o.period === previousPeriod &&
              o.sex === sex,
          )
        : undefined;

    const evidence: EvidenceStatement | null = selectedArea
      ? buildEvidenceStatement(
          {
            indicator,
            areaCode: selectedArea.code,
            areaName: selectedArea.name,
            areaTypeLabel: areaType.label,
            nation: selectedArea.nation,
            period,
            periodLabel: period,
            periodIsPooled: series.pooled,
            pooledYears: series.years,
            observation: selectedObservation,
            benchmarkObservation,
            benchmarkLabel: catalogue.manifest.coverage.benchmark.label,
            previousObservation,
            previousPeriod,
            sex,
            age: observations.age,
          } satisfies EvidenceContext,
          areaType.boundaryVintage,
        )
      : null;

    const notes: MandatoryNotes = {
      indicator: indicator.name,
      indicatorId: indicator.id,
      geography: areaType.label,
      boundaryVintage: areaType.boundaryVintage,
      population: `${sex}, ${observations.age}`,
      period: series.pooled ? `${period} (${series.label.toLowerCase()})` : period,
      benchmark: catalogue.manifest.coverage.benchmark.label,
      unit: indicator.unit ?? 'not stated',
      measureType: measureTypeLabel(indicator),
      classification: viewModel.classificationNote,
      source: indicator.dataSource ?? 'Not stated',
      publisher: indicator.licence.publisher,
      licence: indicator.licence.name,
      retrievedAt: indicator.retrievedAt.slice(0, 10),
      limitation:
        'Descriptive, area-level observation. It supports no causal claim, and ' +
        'area-level patterns do not transfer to individuals.',
      dataVersion:
        `data schema ${catalogue.manifest.schemaVersion}, prepared ` +
        `${catalogue.manifest.generatedAt.slice(0, 10)}`,
      attribution: `${indicator.licence.attribution} Boundaries: ${
        catalogue.manifest.licences.boundaries.attribution
      }`,
    };

    return {
      viewModel,
      observationsForPeriod,
      selectedObservation,
      benchmarkObservation,
      evidence,
      notes,
      period,
      sex,
      availableSexes,
      requiresSexChoice: observations.requiresSexChoice,
      periodSeries: series,
      availablePeriods: series.periods,
      question,
      corrections,
    };
  }, [catalogue, state, selection, registry, observations]);
}
