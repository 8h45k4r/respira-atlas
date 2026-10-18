import { Lock, Unlock, RotateCcw } from 'lucide-react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import type { ResolvedSelection } from './useAnalysis';
import type { ObservationSet } from '@/data/loader';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from '@/components/ui/select';
import { Label, Badge } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { CLASSIFICATION_LABELS } from '@/data/selectors/classification';
import type { GeographyMode } from '@/geography/model';

/**
 * The analytical controls.
 *
 * Every control offers only what the data support: an indicator that is not
 * published at the current level is disabled with the reason stated, rather than
 * selectable and then silently empty.
 */
export function Controls({
  catalogue, state, selection, observations, onChange, onReset,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  selection: ResolvedSelection;
  observations: ObservationSet | null;
  onChange: (patch: Partial<AtlasState>) => void;
  onReset: () => void;
}) {
  const { manifest, indicators } = catalogue;
  const areaTypesInMode = Object.values(manifest.areaTypes).filter(
    (areaType) => areaType.mode === state.geographyMode,
  );

  type IndicatorRecord = (typeof indicators)[number];
  const byDomain = new Map<string, IndicatorRecord[]>();
  for (const indicator of indicators) {
    const list = byDomain.get(indicator.domain) ?? [];
    list.push(indicator);
    byDomain.set(indicator.domain, list);
  }

  const series = observations?.periodSeries ?? [];
  const activeSeries =
    series.find((s) => s.range === selection.periodSeries.range) ?? series[0];

  return (
    <div className="space-y-3.5">
      <div>
        <Label htmlFor="geography-mode">Geography</Label>
        <div
          className="mt-1 inline-flex w-full rounded border border-slate-300 p-0.5"
          role="radiogroup"
          aria-label="Geography mode"
        >
          {(['administrative', 'nhs'] as GeographyMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={state.geographyMode === mode}
              onClick={() =>
                onChange({
                  geographyMode: mode,
                  // Clear the level and selection: the two trees share no areas.
                  areaTypeKey: null,
                  selectedAreaCode: null,
                  comparisonAreaCodes: [],
                })
              }
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                  state.geographyMode === mode
                    ? 'bg-navy-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {mode === 'administrative' ? 'Administrative' : 'NHS'}
            </button>
          ))}
        </div>
        <p className="mt-1 text-2xs leading-relaxed text-slate-500">
          {manifest.geographyModes[state.geographyMode]?.description}
        </p>
      </div>

      <div>
        <Label htmlFor="area-type">Level</Label>
        <Select
          value={selection.areaType.key}
          onValueChange={(value) =>
            onChange({ areaTypeKey: value, selectedAreaCode: null, comparisonAreaCodes: [] })
          }
        >
          <SelectTrigger id="area-type" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {areaTypesInMode.map((areaType) => (
              <SelectItem
                key={areaType.key}
                value={areaType.key}
                hint={`${areaType.boundaryVintage} boundaries · ${areaType.dataScope} data`}
              >
                {areaType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="indicator">Indicator</Label>
        <Select
          value={String(selection.indicator.id)}
          onValueChange={(value) => onChange({ indicatorId: Number(value), period: null })}
        >
          <SelectTrigger id="indicator" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-w-[26rem]">
            {[...byDomain.entries()].map(([domain, list]) => (
              <SelectGroup key={domain}>
                <SelectLabel>{manifest.domains[domain] ?? domain}</SelectLabel>
                {list.map((indicator) => {
                  const availableHere = Boolean(indicator.geographies[selection.areaType.key]);
                  const elsewhere = Object.values(indicator.geographies)
                    .map((geography) => geography.label)
                    .join(', ');
                  return (
                    <SelectItem
                      key={indicator.id}
                      value={String(indicator.id)}
                      disabled={!availableHere}
                      hint={
                        availableHere
                          ? `${indicator.unit} · ${indicator.valueType}`
                          : `Not published for ${selection.areaType.label}. Available: ${elsewhere || 'nowhere in this release'}`
                      }
                    >
                      {indicator.shortName}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {series.length > 1 ? (
        <div>
          <Label htmlFor="period-series">Period series</Label>
          <Select
            value={activeSeries.range}
            onValueChange={(value) => onChange({ periodSeries: value, period: null })}
          >
            <SelectTrigger id="period-series" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {series.map((s) => (
                <SelectItem key={s.range} value={s.range} hint={`${s.periodCount} periods`}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-2xs leading-relaxed text-amber-800">
            This indicator publishes {series.map((s) => s.label.toLowerCase()).join(' and ')}{' '}
            periods. They are separate series and are never plotted as one line.
          </p>
        </div>
      ) : null}

      <div>
        <Label htmlFor="period">Period</Label>
        <Select
          value={selection.period}
          onValueChange={(value) => onChange({ period: value })}
        >
          <SelectTrigger id="period" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(activeSeries?.periods ?? []).map((period) => (
              <SelectItem key={period} value={period}>
                {period}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeSeries?.pooled ? (
          <p className="mt-1 text-2xs leading-relaxed text-slate-500">
            {activeSeries.description}
          </p>
        ) : null}
      </div>

      <div className="rule pt-3">
        <Label htmlFor="classification">Map classification</Label>
        <Select
          value={state.classification}
          onValueChange={(value) =>
            onChange({ classification: value as AtlasState['classification'] })
          }
        >
          <SelectTrigger id="classification" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quantile" hint="Equal number of areas per class (default)">
              {CLASSIFICATION_LABELS.quantile}
            </SelectItem>
            <SelectItem value="equal-interval" hint="Equal value width per class">
              {CLASSIFICATION_LABELS['equal-interval']}
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="mt-2 flex items-center gap-2">
          <Label htmlFor="class-count" className="shrink-0">Classes</Label>
          <input
            id="class-count"
            type="range"
            min={3}
            max={7}
            step={1}
            value={state.classCount}
            onChange={(event) => onChange({ classCount: Number(event.target.value) })}
            className="h-1.5 flex-1 accent-teal-700"
            aria-valuetext={`${state.classCount} classes`}
          />
          <span className="w-4 text-right text-xs tabular-nums text-slate-700">
            {state.classCount}
          </span>
        </div>

        <Button
          variant={state.lockScale ? 'teal' : 'outline'}
          size="sm"
          className="mt-2 w-full"
          onClick={() => onChange({ lockScale: !state.lockScale })}
          aria-pressed={state.lockScale}
        >
          {state.lockScale ? (
            <Lock className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Unlock className="h-3.5 w-3.5" aria-hidden />
          )}
          {state.lockScale ? 'Scale locked across periods' : 'Lock scale across periods'}
        </Button>
        <p className="mt-1 text-2xs leading-relaxed text-slate-500">
          {state.lockScale
            ? 'Class breaks are computed once from the whole series, so colours mean the same thing in every period.'
            : 'Class breaks are recomputed for the selected period. Lock the scale before comparing periods.'}
        </p>
      </div>

      <div className="rule flex items-center justify-between pt-3">
        <Badge tone="teal">{manifest.coverage.nationsWithData.join(', ')} coverage</Badge>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset
        </Button>
      </div>
    </div>
  );
}
