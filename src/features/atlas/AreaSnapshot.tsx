import { ArrowDownRight, ArrowUpRight, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Indicator } from '@/data/schemas/manifest';
import type { Observation, PresentObservation, TrendFlag } from '@/data/schemas/observation';
import { isPresent } from '@/data/schemas/observation';
import type { BenchmarkComparison } from '@/data/selectors/comparison';
import { formatValue, unitLabel } from '@/data/selectors/format';
import { axisRuleFor, valueDomain } from '@/charts/axis-rules';
import { CHART_INK, SELECTION } from '@/charts/palette';
import type { Caveat } from '@/components/common/CaveatChips';

/** Signed difference and its unit, kept apart so the number can be large. */
function signedDifference(value: number, indicator: Indicator): { number: string; unit: string } {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  const number = `${sign}${formatValue(Math.abs(value), indicator)}`;
  if (indicator.unit === '%') return { number, unit: 'pp' };
  const unit = unitLabel(indicator);
  return { number, unit: unit && unit !== 'value' ? unit : '' };
}

function Amount({ value, indicator }: { value: number; indicator: Indicator }) {
  const { number, unit } = signedDifference(value, indicator);
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
      <span>{number}</span>
      {unit ? <span className="font-figure text-2xs font-normal text-slate-500">{unit}</span> : null}
    </span>
  );
}

function DirectionIcon({ value }: { value: number }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : ArrowRight;
  return <Icon className="h-4 w-4 shrink-0" aria-hidden />;
}

/** One number with a label, the atlas's smallest infographic. */
function Tile({ label, children, footer }: {
  label: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-white px-2.5 py-2">
      <p className="label-caps text-[0.6rem]">{label}</p>
      <div className="mt-0.5 flex items-center gap-1 text-base font-semibold tabular-nums text-oxford-900">
        {children}
      </div>
      {footer ? <div className="mt-0.5 font-figure text-2xs text-slate-500">{footer}</div> : null}
    </div>
  );
}

export function DifferenceTile({ comparison, indicator }: {
  comparison: BenchmarkComparison; indicator: Indicator;
}) {
  const relative = comparison.relativeDifferencePercent;
  return (
    <Tile
      label={`vs ${comparison.benchmarkLabel}`}
      footer={
        relative !== null && comparison.direction !== 'equal'
          ? `${Math.abs(relative).toFixed(Math.abs(relative) >= 10 ? 0 : 1)}% ${comparison.direction}`
          : 'same value'
      }
    >
      <DirectionIcon value={comparison.absoluteDifference} />
      <Amount value={comparison.absoluteDifference} indicator={indicator} />
    </Tile>
  );
}

const TREND: Partial<Record<TrendFlag, { icon: typeof Minus; text: string }>> = {
  increasing: { icon: TrendingUp, text: 'rising' },
  'increasing-worse': { icon: TrendingUp, text: 'rising' },
  decreasing: { icon: TrendingDown, text: 'falling' },
  'decreasing-better': { icon: TrendingDown, text: 'falling' },
  'no-significant-change': { icon: Minus, text: 'no significant change' },
};

/**
 * Change since the most recent period that shares no years with this one.
 * For a rolling 3-year series that is three steps back: neighbouring pooled
 * periods share two years of data, so their difference is mostly overlap.
 */
export function ChangeTile({ current, previous, previousPeriod, indicator }: {
  current: PresentObservation;
  previous: Observation | undefined;
  previousPeriod: string | null;
  indicator: Indicator;
}) {
  const trend = TREND[current.trend];
  const TrendIcon = trend?.icon;
  const footer = trend && TrendIcon ? (
    <span className="inline-flex items-center gap-1">
      <TrendIcon className="h-3 w-3" aria-hidden /> publisher: {trend.text}
    </span>
  ) : 'two points, not a trend';

  if (!previousPeriod || !isPresent(previous)) {
    return <Tile label="Change" footer={footer}><span className="text-sm text-slate-500">no earlier comparable period</span></Tile>;
  }
  const delta = current.value - previous.value;
  return (
    <Tile label={`Since ${previousPeriod.replace(/\s*-\s*/g, '–')}`} footer={footer}>
      <DirectionIcon value={delta} />
      <Amount value={delta} indicator={indicator} />
    </Tile>
  );
}

/**
 * The area against England over time, small enough to sit in the panel.
 * Follows the indicator's axis rule, so a rate still starts at zero here.
 */
export function Sparkline({ periods, area, england, indicator, currentPeriod, areaLabel }: {
  periods: readonly string[];
  area: ReadonlyMap<string, Observation>;
  england: ReadonlyMap<string, Observation>;
  indicator: Indicator;
  currentPeriod: string;
  areaLabel: string;
}) {
  const W = 260;
  const H = 70;
  const left = 4;
  const right = 4;
  const top = 6;
  const bottom = 16;
  const valueOf = (map: ReadonlyMap<string, Observation>, period: string) => {
    const o = map.get(period);
    return isPresent(o) ? o.value : null;
  };
  const values = periods.flatMap((p) => [valueOf(area, p), valueOf(england, p)])
    .filter((v): v is number => v !== null);
  if (periods.length < 2 || values.length === 0) return null;

  const { domain, broken } = valueDomain(values, axisRuleFor(indicator), 3);
  const x = (i: number) => left + (i / (periods.length - 1)) * (W - left - right);
  const y = (v: number) => top + (1 - (v - domain[0]) / (domain[1] - domain[0])) * (H - top - bottom);

  const pathFor = (map: ReadonlyMap<string, Observation>) => {
    let d = '';
    let pen = false;
    periods.forEach((p, i) => {
      const v = valueOf(map, p);
      if (v === null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };

  const currentIndex = periods.indexOf(currentPeriod);
  const currentValue = currentIndex >= 0 ? valueOf(area, currentPeriod) : null;
  const short = (p: string) => p.replace(/\s*-\s*/g, '–');

  return (
    <figure className="rounded-md border border-slate-200 bg-white px-2 pb-1 pt-1.5">
      <figcaption className="flex items-center gap-3 font-figure text-[0.65rem] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <svg width="14" height="4" aria-hidden><line x1="0" y1="2" x2="14" y2="2" stroke={SELECTION.stroke} strokeWidth="2.2" /></svg>
          {areaLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <svg width="14" height="4" aria-hidden><line x1="0" y1="2" x2="14" y2="2" stroke={CHART_INK.benchmark} strokeWidth="1.5" strokeDasharray="3 2" /></svg>
          England
        </span>
        {broken ? <span className="ml-auto text-slate-400">axis not from 0</span> : null}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden>
        <path d={pathFor(england)} fill="none" stroke={CHART_INK.benchmark} strokeWidth={1.4} strokeDasharray="3 2.5" />
        <path d={pathFor(area)} fill="none" stroke={SELECTION.stroke} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        {currentValue !== null ? (
          <circle cx={x(currentIndex)} cy={y(currentValue)} r={3.4} fill={SELECTION.stroke} stroke="#fff" strokeWidth={1.2} />
        ) : null}
        <text x={left} y={H - 3} fontSize={9} fill={CHART_INK.axis}>{short(periods[0])}</text>
        <text x={W - right} y={H - 3} fontSize={9} fill={CHART_INK.axis} textAnchor="end">
          {short(periods[periods.length - 1])}
        </text>
      </svg>
    </figure>
  );
}

/** Caveats that apply to this one area's figure, as chips. */
export function areaCaveats({ indicator, observation, pooled, years }: {
  indicator: Indicator;
  observation: PresentObservation;
  pooled: boolean;
  years: number;
}): Caveat[] {
  const caveats: Caveat[] = [];
  if (indicator.direction === 'not-interpretable' && indicator.valueType === 'Proportion') {
    caveats.push({ kind: 'recording', label: 'Recorded, not true, prevalence' });
  }
  if (pooled) caveats.push({ kind: 'pooled', label: `${years}-year pooled period` });
  if (indicator.valueType === 'Crude rate') {
    caveats.push({ kind: 'warning', label: 'Not age-standardised' });
  }
  if (observation.count !== null && observation.count < 20 && indicator.countIsMeaningful) {
    caveats.push({ kind: 'warning', label: 'Small count: unstable' });
  }
  caveats.push({ kind: 'not-causal', label: 'Describes, does not explain' });
  return caveats;
}
