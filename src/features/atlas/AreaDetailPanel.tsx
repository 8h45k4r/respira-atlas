import { useState } from 'react';
import { X, Plus, Minus, ChevronDown, FileText } from 'lucide-react';
import type { Indicator } from '@/data/schemas/manifest';
import type { Observation } from '@/data/schemas/observation';
import { isPresent } from '@/data/schemas/observation';
import type { AreaRecord } from '@/geography/model';
import type { EvidenceStatement } from '@/data/selectors/evidence';
import type { ObservationSet } from '@/data/loader';
import { seriesFor, benchmarkSeriesFor } from '@/data/loader';
import { formatWithUnit, formatInterval, formatCount } from '@/data/selectors/format';
import { Button } from '@/components/ui/button';
import { EvidencePanel } from '@/components/common/EvidencePanel';
import { CaveatChips } from '@/components/common/CaveatChips';
import { MAX_COMPARISON_AREAS } from '@/state/atlas-state';
import type { FlagLevel } from '@/data/selectors/flag-level';
import { IntervalVsEngland } from './IntervalVsEngland';
import { DifferenceTile, ChangeTile, Sparkline, areaCaveats } from './AreaSnapshot';
import { cn } from '@/lib/utils';

/**
 * The pinned detail for a selected area, linked to the map and charts.
 *
 * Read top to bottom it is a picture, not a paragraph: the value, where it
 * sits against England with its interval and the publisher's flag, how far
 * from England and how it has moved, the series against England, and the
 * caveats as chips. The full written statement is one click away and is what
 * exports carry.
 */
export function AreaDetailPanel({
  area, observation, benchmark, flagLevel, observations, sex, periodSeries,
  indicator, evidence, period, inComparison, comparisonCount, onClose, onToggleComparison,
}: {
  area: AreaRecord;
  observation: Observation | undefined;
  benchmark: Observation | undefined;
  flagLevel: FlagLevel;
  observations: ObservationSet;
  sex: string;
  periodSeries: { periods: readonly string[]; pooled: boolean; years: number };
  indicator: Indicator;
  evidence: EvidenceStatement | null;
  period: string;
  inComparison: boolean;
  comparisonCount: number;
  onClose: () => void;
  onToggleComparison: () => void;
}) {
  const [statementOpen, setStatementOpen] = useState(false);
  const atCapacity = !inComparison && comparisonCount >= MAX_COMPARISON_AREAS;

  const areaSeries = seriesFor(observations, area.code, sex);
  const englandSeries = benchmarkSeriesFor(observations, sex);
  const index = periodSeries.periods.indexOf(period);
  // The nearest earlier period sharing no years with this one.
  const step = periodSeries.pooled ? periodSeries.years : 1;
  const previousPeriod = index - step >= 0 ? periodSeries.periods[index - step] : null;

  return (
    <aside className="panel flex min-h-0 flex-col" aria-label={`Detail for ${area.name}`}>
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-3.5 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-oxford-900">{area.name}</h2>
          <p className="mt-0.5 font-figure text-2xs text-slate-500">
            {area.areaTypeLabel} · {area.nation} · {area.code}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Clear selection">
          <X className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
        {isPresent(observation) ? (
          <>
            <div>
              <p className="text-2xl font-semibold tabular-nums leading-none text-oxford-900">
                {formatWithUnit(observation.value, indicator)}
              </p>
              <p className="mt-1 font-figure text-2xs text-slate-600">
                {period}
                {observation.lowerCi95 !== null && observation.upperCi95 !== null
                  ? ` · 95% CI ${formatInterval(observation.lowerCi95, observation.upperCi95, indicator)}`
                  : ' · no confidence interval published'}
                {observation.count !== null && indicator.countIsMeaningful
                  ? ` · ${formatCount(observation.count)}${
                      observation.denominator !== null ? ` of ${formatCount(Math.round(observation.denominator))}` : ''
                    }`
                  : ''}
              </p>
              {isPresent(benchmark) ? (
                <IntervalVsEngland
                  observation={observation}
                  england={benchmark}
                  indicator={indicator}
                  flagLevel={flagLevel}
                />
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {evidence?.comparisonDetail ? (
                <DifferenceTile comparison={evidence.comparisonDetail} indicator={indicator} />
              ) : null}
              <ChangeTile
                current={observation}
                previous={previousPeriod ? areaSeries.get(previousPeriod) : undefined}
                previousPeriod={previousPeriod}
                indicator={indicator}
              />
            </div>

            <Sparkline
              periods={periodSeries.periods}
              area={areaSeries}
              england={englandSeries}
              indicator={indicator}
              currentPeriod={period}
              areaLabel={area.name}
            />

            <CaveatChips
              caveats={areaCaveats({
                indicator, observation, pooled: periodSeries.pooled, years: periodSeries.years,
              })}
            />
          </>
        ) : (
          <div className="border border-dashed border-slate-300 bg-slate-50 p-2.5">
            <p className="text-xs font-semibold text-oxford-900">No value for this selection</p>
            <p className="mt-1 text-2xs leading-relaxed text-slate-600">
              {evidence?.unavailable?.explanation ??
                'No observation is published for this area and period.'}
            </p>
          </div>
        )}

        <Button
          variant={inComparison ? 'subtle' : 'outline'}
          size="sm"
          className="w-full"
          onClick={onToggleComparison}
          disabled={atCapacity}
          aria-pressed={inComparison}
        >
          {inComparison ? (
            <Minus className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Plus className="h-3.5 w-3.5" aria-hidden />
          )}
          {inComparison
            ? 'Remove from comparison'
            : atCapacity
              ? `Comparison full (${MAX_COMPARISON_AREAS} areas)`
              : 'Add to comparison'}
        </Button>

        {evidence ? (
          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              aria-expanded={statementOpen}
              onClick={() => setStatementOpen((open) => !open)}
              className="flex w-full items-center gap-1.5 rounded font-figure text-2xs font-semibold text-oxford-800 hover:text-oxford-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {statementOpen ? 'Hide the full statement' : 'Read the full statement'}
              <ChevronDown
                className={cn('ml-auto h-3.5 w-3.5 transition-transform', statementOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {/* Kept in the page when closed, for screen readers and checks. */}
            <div className={cn('mt-2', !statementOpen && 'sr-only')}>
              <EvidencePanel statement={evidence} compact />
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
