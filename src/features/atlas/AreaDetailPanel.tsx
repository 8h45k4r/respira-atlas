import { X, Plus, Minus } from 'lucide-react';
import type { Indicator } from '@/data/schemas/manifest';
import type { Observation } from '@/data/schemas/observation';
import { isPresent } from '@/data/schemas/observation';
import type { AreaRecord } from '@/geography/model';
import type { EvidenceStatement } from '@/data/selectors/evidence';
import { formatWithUnit, formatInterval, formatCount } from '@/data/selectors/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { EvidencePanel } from '@/components/common/EvidencePanel';
import { MAX_COMPARISON_AREAS } from '@/state/atlas-state';

/** The pinned detail for a clicked area, linked to the map and table. */
export function AreaDetailPanel({
  area, observation, indicator, evidence, period, inComparison,
  comparisonCount, onClose, onToggleComparison,
}: {
  area: AreaRecord;
  observation: Observation | undefined;
  indicator: Indicator;
  evidence: EvidenceStatement | null;
  period: string;
  inComparison: boolean;
  comparisonCount: number;
  onClose: () => void;
  onToggleComparison: () => void;
}) {
  const atCapacity = !inComparison && comparisonCount >= MAX_COMPARISON_AREAS;

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

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        {isPresent(observation) ? (
          <div className="mb-3">
            <p className="text-2xl font-semibold tabular-nums leading-none text-oxford-900">
              {formatWithUnit(observation.value, indicator)}
            </p>
            <p className="mt-1 font-figure text-2xs text-slate-600">
              {period}
              {observation.lowerCi95 !== null && observation.upperCi95 !== null
                ? ` · 95% CI ${formatInterval(observation.lowerCi95, observation.upperCi95, indicator)}`
                : ' · no confidence interval published'}
            </p>
            {observation.count !== null && indicator.countIsMeaningful ? (
              <p className="mt-0.5 font-figure text-2xs text-slate-500">
                Count {formatCount(observation.count)}
                {observation.denominator !== null
                  ? ` of ${formatCount(observation.denominator)}`
                  : ''}
              </p>
            ) : null}
            {observation.significance !== 'not-compared' ? (
              <Badge tone="neutral" className="mt-1.5">
                Publisher flag vs England: {observation.significance}
              </Badge>
            ) : null}
          </div>
        ) : (
          <div className="mb-3 border border-dashed border-slate-300 bg-slate-50 p-2.5">
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
          className="mb-3 w-full"
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

        {evidence ? <EvidencePanel statement={evidence} compact /> : null}
      </div>
    </aside>
  );
}
