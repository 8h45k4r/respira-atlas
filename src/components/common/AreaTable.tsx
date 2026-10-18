import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Indicator } from '@/data/schemas/manifest';
import { isPresent } from '@/data/schemas/observation';
import { formatValue, formatCount } from '@/data/selectors/format';
import type { AreaViewModel } from '@/charts/map-view-model';
import { Badge } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

const AVAILABILITY_LABEL: Record<string, string> = {
  present: 'Value',
  missing: 'No value published',
  suppressed: 'Suppressed',
  'not-applicable': 'Not applicable',
  'no-observation': 'No observation',
};

type SortKey = 'name' | 'value';

/**
 * The keyboard-accessible, screen-reader-friendly equivalent of the map.
 *
 * Every row is selectable, so a keyboard user can do everything a mouse user can
 * do on the map. Availability is its own column: a blank value cell always has
 * a stated reason beside it and can never be read as a zero.
 */
export function AreaTable({
  areas, indicator, selectedCode, comparisonCodes, onSelect, caption, dense = false,
}: {
  areas: readonly AreaViewModel[];
  indicator: Indicator;
  selectedCode: string | null;
  comparisonCodes: readonly string[];
  onSelect?: (code: string) => void;
  caption: string;
  dense?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [descending, setDescending] = useState(true);

  const sorted = useMemo(() => {
    const rows = [...areas];
    rows.sort((a, b) => {
      if (sortKey === 'name') {
        return descending
          ? b.name.localeCompare(a.name, 'en-GB')
          : a.name.localeCompare(b.name, 'en-GB');
      }
      const av = a.render.kind === 'value' ? a.render.value : null;
      const bv = b.render.kind === 'value' ? b.render.value : null;
      // Areas without a value always sort last, in either direction: they are
      // not "low", they are unknown.
      if (av === null && bv === null) return a.name.localeCompare(b.name, 'en-GB');
      if (av === null) return 1;
      if (bv === null) return -1;
      return descending ? bv - av : av - bv;
    });
    return rows;
  }, [areas, sortKey, descending]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) setDescending((d) => !d);
    else {
      setSortKey(key);
      setDescending(key === 'value');
    }
  };

  return (
    <div className="scrollbar-thin max-h-[60vh] overflow-auto">
      <table className="w-full border-collapse text-left font-figure text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-slate-300">
            <SortableHeader
              label="Area"
              active={sortKey === 'name'}
              descending={descending}
              onClick={() => toggle('name')}
            />
            <th scope="col" className="px-2 py-1.5 font-semibold text-slate-600">Nation</th>
            <SortableHeader
              label={`Value (${indicator.unit ?? ''})`}
              active={sortKey === 'value'}
              descending={descending}
              onClick={() => toggle('value')}
              align="right"
            />
            <th scope="col" className="px-2 py-1.5 text-right font-semibold text-slate-600">
              95% CI
            </th>
            {indicator.countIsMeaningful ? (
              <th scope="col" className="px-2 py-1.5 text-right font-semibold text-slate-600">
                Count
              </th>
            ) : null}
            <th scope="col" className="px-2 py-1.5 font-semibold text-slate-600">
              Availability
            </th>
            <th scope="col" className="px-2 py-1.5 font-semibold text-slate-600">
              vs England
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((area) => {
            const isSelected = area.code === selectedCode;
            const comparisonIndex = comparisonCodes.indexOf(area.code);
            const o = area.observation;
            return (
              <tr
                key={area.code}
                className={cn(
                  'border-b border-slate-100',
                  dense ? 'h-7' : 'h-8',
                  isSelected && 'bg-accent',
                  comparisonIndex >= 0 && !isSelected && 'bg-slate-50',
                  onSelect && 'cursor-pointer hover:bg-slate-50',
                )}
                aria-selected={isSelected}
                {...(onSelect
                  ? {
                      tabIndex: 0,
                      role: 'button',
                      onClick: () => onSelect(area.code),
                      onKeyDown: (event: React.KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelect(area.code);
                        }
                      },
                    }
                  : {})}
              >
                <th scope="row" className="px-2 py-1 font-normal text-navy-900">
                  <span className="flex items-center gap-1.5">
                    {/* Non-colour cue for selection. */}
                    {isSelected ? (
                      <span aria-label="Selected" className="font-semibold text-navy-900">▸</span>
                    ) : comparisonIndex >= 0 ? (
                      <span aria-label={`Comparison ${comparisonIndex + 1}`} className="text-slate-500">
                        {comparisonIndex + 1}
                      </span>
                    ) : null}
                    {area.name}
                  </span>
                </th>
                <td className="px-2 py-1 text-slate-600">{area.nation}</td>
                <td className="px-2 py-1 text-right tabular-nums text-navy-900">
                  {isPresent(o) ? formatValue(o.value, indicator) : '—'}
                </td>
                <td className="px-2 py-1 text-right tabular-nums text-slate-600">
                  {isPresent(o) && o.lowerCi95 !== null && o.upperCi95 !== null
                    ? `${formatValue(o.lowerCi95, indicator)}–${formatValue(o.upperCi95, indicator)}`
                    : '—'}
                </td>
                {indicator.countIsMeaningful ? (
                  <td className="px-2 py-1 text-right tabular-nums text-slate-600">
                    {isPresent(o) && o.count !== null ? formatCount(o.count) : '—'}
                  </td>
                ) : null}
                <td className="px-2 py-1">
                  {area.render.kind === 'value' ? (
                    <span className="text-slate-500">Value</span>
                  ) : (
                    <Badge tone={o?.state === 'suppressed' ? 'warn' : 'muted'}>
                      {AVAILABILITY_LABEL[o?.state ?? 'no-observation'] ?? 'No value'}
                    </Badge>
                  )}
                </td>
                <td className="px-2 py-1 text-slate-600">
                  {o && o.significance !== 'not-compared' ? o.significance : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 px-2 font-figure text-2xs text-slate-500">
        A dash means no value, never zero. The “vs England” column reproduces the
        publisher’s own significance flag; it is not recalculated here. Ranking a
        column does not make a performance league table — neighbouring values are
        usually not distinguishable given their confidence intervals.
      </p>
    </div>
  );
}

function SortableHeader({
  label, active, descending, onClick, align = 'left',
}: {
  label: string;
  active: boolean;
  descending: boolean;
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? (descending ? 'descending' : 'ascending') : 'none'}
      className={cn('px-2 py-1.5 font-semibold text-slate-600', align === 'right' && 'text-right')}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 rounded hover:text-navy-900',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700',
        )}
      >
        {label}
        {active ? (
          descending ? (
            <ArrowDown className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowUp className="h-3 w-3" aria-hidden />
          )
        ) : null}
      </button>
    </th>
  );
}
