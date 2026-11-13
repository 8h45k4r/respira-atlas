import { Check, X, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { CountUp, Reveal, useInView } from '@/components/motion/motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------- stats */

export interface StatItem {
  readonly value: number;
  readonly decimals?: number;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly label: string;
  /** The one number the step is about; drawn larger and in brass. */
  readonly emphasis?: boolean;
}

/** Big numbers with short labels, counting up as they appear. */
export function StatCallouts({ items }: { items: readonly StatItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
      {items.map((item, index) => (
        <Reveal key={item.label} delay={index * 90}
          className={cn(
            'rounded-lg border px-3 py-2.5',
            item.emphasis ? 'border-brass-300 bg-brass-50' : 'border-slate-200 bg-white',
          )}
        >
          <CountUp
            value={item.value}
            decimals={item.decimals ?? 0}
            prefix={item.prefix}
            suffix={item.suffix}
            className={cn(
              'block font-semibold leading-none',
              item.emphasis ? 'text-3xl text-brass-700' : 'text-2xl text-oxford-900',
            )}
          />
          <p className="mt-1.5 font-figure text-2xs leading-snug text-slate-600">{item.label}</p>
        </Reveal>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- waffle */

export type SplitStyle =
  | 'different' | 'different-light' | 'similar' | 'present' | 'suppressed'
  | 'missing' | 'outside' | 'muted';

export interface SplitSegment {
  readonly label: string;
  readonly count: number;
  readonly style: SplitStyle;
}

/** Cell appearance: fill and border, plus a pattern where hue alone would not do. */
const CELL: Record<SplitStyle, string> = {
  different: 'bg-oxford-800 border-oxford-800',
  'different-light': 'bg-oxford-400 border-oxford-400',
  similar: 'bg-white border-oxford-700',
  present: 'bg-oxford-500 border-oxford-500',
  suppressed: 'border-slate-400 bg-[repeating-linear-gradient(90deg,#94a3b8_0_1px,#e3e1dd_1px_3px)]',
  missing: 'bg-slate-200 border-slate-300',
  outside: 'border-slate-300 bg-[repeating-linear-gradient(45deg,#c9c6c0_0_1px,#f8f8f7_1px_4px)]',
  muted: 'bg-slate-300 border-slate-300',
};

/**
 * One square per area. A waffle shows a count and a share at once, and every
 * square is a real place, so "34 of 152" reads as 34 squares, not a percentage.
 */
export function Waffle({ segments, caption }: { segments: readonly SplitSegment[]; caption?: string }) {
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const cells: { style: SplitStyle; key: string }[] = [];
  segments.forEach((segment) => {
    for (let i = 0; i < segment.count; i += 1) cells.push({ style: segment.style, key: `${segment.label}-${i}` });
  });
  const summary = segments.map((s) => `${s.count} ${s.label}`).join(', ');

  return (
    <figure>
      <div
        ref={ref}
        role="img"
        aria-label={`${caption ? `${caption}: ` : ''}${summary}, of ${total}.`}
        className="flex flex-wrap gap-[3px]"
      >
        {cells.map((cell, index) => (
          <span
            key={cell.key}
            aria-hidden
            className={cn(
              'h-[11px] w-[11px] rounded-[2px] border',
              CELL[cell.style],
              inView && !reduced ? 'cell-pop' : inView ? '' : 'opacity-0',
            )}
            style={inView && !reduced ? { animationDelay: `${Math.min(index * 5, 900)}ms` } : undefined}
          />
        ))}
      </div>
      <figcaption className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.filter((s) => s.count > 0).map((segment) => (
          <span key={segment.label} className="inline-flex items-center gap-1.5 font-figure text-2xs text-slate-700">
            <span aria-hidden className={cn('h-3 w-3 rounded-[2px] border', CELL[segment.style])} />
            <CountUp value={segment.count} className="font-semibold text-oxford-900" />
            {segment.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- range */

export interface RangeEnd {
  readonly value: number;
  readonly display: string;
  readonly name?: string;
}

/**
 * Lowest, median and highest on one track. The track grows from the lowest
 * value; the ratio between the ends sits above it.
 */
export function RangeBar({ measure, unit, low, median, high, ratio }: {
  measure: string;
  unit: string;
  low: RangeEnd;
  median?: RangeEnd | null;
  high: RangeEnd;
  ratio?: string | null;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const span = high.value - low.value || 1;
  const medianAt = median ? ((median.value - low.value) / span) * 100 : null;
  return (
    <figure className="rounded-lg border border-slate-200 bg-white px-3 pb-2.5 pt-2">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-oxford-900">{measure}</span>
        {ratio ? (
          <span className="rounded-full bg-brass-50 px-2 py-0.5 font-figure text-2xs font-semibold text-brass-800">
            {ratio} between the ends
          </span>
        ) : null}
      </figcaption>
      <div ref={ref} className="relative mx-2 mt-5 h-2">
        <div className="absolute inset-0 rounded-full bg-slate-100" />
        <div className={cn('absolute inset-0 rounded-full bg-gradient-to-r from-oxford-200 to-oxford-800', inView ? 'grow-x' : 'opacity-0')} />
        <span className="absolute -top-1 left-0 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-oxford-300 shadow" aria-hidden />
        <span className="absolute -top-1 right-0 h-4 w-4 translate-x-1/2 rounded-full border-2 border-white bg-oxford-900 shadow" aria-hidden />
        {medianAt !== null ? (
          <span className="absolute -top-2 h-6 w-0.5 bg-brass-600" style={{ left: `${medianAt}%` }} aria-hidden />
        ) : null}
        {medianAt !== null && median ? (
          <span
            className="absolute -top-6 -translate-x-1/2 whitespace-nowrap font-figure text-[0.65rem] text-brass-800"
            style={{ left: `${medianAt}%` }}
          >
            median {median.display}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex justify-between gap-3 font-figure text-2xs">
        <span className="min-w-0">
          <span className="block text-sm font-semibold tabular-nums text-oxford-900">{low.display}</span>
          {low.name ? <span className="block truncate text-slate-500">{low.name}</span> : null}
        </span>
        <span className="min-w-0 text-right">
          <span className="block text-sm font-semibold tabular-nums text-oxford-900">{high.display}</span>
          {high.name ? <span className="block truncate text-slate-500">{high.name}</span> : null}
        </span>
      </div>
      <p className="sr-only">
        {measure} ranges from {low.display}{low.name ? ` in ${low.name}` : ''} to {high.display}
        {high.name ? ` in ${high.name}` : ''} {unit}{median ? `, median ${median.display}` : ''}.
      </p>
    </figure>
  );
}

/* ---------------------------------------------------------------- contrast */

/** Two columns: what this is evidence of, and what it is not. */
export function ContrastCards({ is, isNot, isLabel = 'This shows', isNotLabel = 'It does not show' }: {
  is: readonly string[];
  isNot: readonly string[];
  isLabel?: string;
  isNotLabel?: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Reveal className="rounded-lg border border-oxford-200 bg-oxford-50 px-3 py-2.5">
        <p className="label-caps text-oxford-700">{isLabel}</p>
        <ul className="mt-1.5 space-y-1">
          {is.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-xs text-oxford-900">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-oxford-600" aria-hidden />{item}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={120} className="rounded-lg border border-brass-200 bg-brass-50 px-3 py-2.5">
        <p className="label-caps text-brass-800">{isNotLabel}</p>
        <ul className="mt-1.5 space-y-1">
          {isNot.map((item) => (
            <li key={item} className="flex items-start gap-1.5 text-xs text-brass-900">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass-600" aria-hidden />{item}
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}

/* ---------------------------------------------------------------- icon cards */

/**
 * A list of statements as cards: the first sentence is the headline, the rest
 * is the supporting line. Nothing is dropped; it is only laid out to be scanned.
 */
export function IconCards({ items, icon: Icon, tone = 'brass', columns = 2 }: {
  items: readonly string[];
  icon: LucideIcon;
  tone?: 'brass' | 'oxford' | 'amber';
  columns?: 1 | 2;
}) {
  const tones = {
    brass: 'border-brass-200 bg-brass-50/60 [&_svg]:text-brass-600 text-brass-950',
    oxford: 'border-slate-200 bg-white [&_svg]:text-oxford-500 text-oxford-950',
    amber: 'border-amber-200 bg-amber-50/60 [&_svg]:text-amber-700 text-amber-950',
  } as const;
  return (
    <ul className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')}>
      {items.map((item, index) => {
        const split = item.match(/^(.+?[.?!])\s+(.*)$/s);
        const head = split ? split[1] : item;
        const rest = split ? split[2] : null;
        return (
          <Reveal as="li" key={item} delay={index * 80}
            className={cn('flex gap-2 rounded-lg border px-3 py-2.5', tones[tone])}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-snug">{head}</span>
              {rest ? <span className="mt-0.5 block text-2xs leading-relaxed opacity-80">{rest}</span> : null}
            </span>
          </Reveal>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------------- flow */

export interface FlowNode {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly content: ReactNode;
}

/**
 * Connected steps: a reading order drawn as a path. On wide screens the nodes
 * run left to right with a connector that draws itself; on narrow screens they
 * stack, connected down the left edge.
 */
export function FlowSteps({ nodes }: { nodes: readonly FlowNode[] }) {
  const [ref, inView] = useInView<HTMLOListElement>();
  return (
    <ol ref={ref} className="relative grid gap-3 md:grid-flow-col md:auto-cols-fr">
      {/* Connector, drawn behind the nodes. */}
      <svg aria-hidden className="pointer-events-none absolute left-0 right-0 top-[18px] hidden h-1 w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 2">
        <line x1="2" y1="1" x2="98" y2="1" pathLength={1} stroke="#d8b468" strokeWidth="2"
          vectorEffect="non-scaling-stroke" strokeDasharray="1" className={inView ? 'draw-line' : ''}
          style={inView ? undefined : { strokeDashoffset: 1 }} />
      </svg>
      {nodes.map((node, index) => {
        const Icon = node.icon;
        return (
          <Reveal as="li" key={node.label} delay={150 + index * 160} className="relative min-w-0">
            <div className="flex flex-col items-start gap-1.5">
              <span className={cn(
                'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-oxford-800 text-white shadow',
                index === 0 && 'pulse-ring',
              )}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="label-caps text-oxford-700">
                <span className="mr-1 font-figure text-brass-600">{index + 1}</span>{node.label}
              </span>
            </div>
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">{node.content}</div>
          </Reveal>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------------- rules */

export interface Rule {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: ReactNode;
  readonly tone?: 'oxford' | 'brass' | 'amber';
}

/** Rules as a grid of cards: an icon, a short title, the full rule beneath. */
export function RuleGrid({ rules, columns = 2 }: { rules: readonly Rule[]; columns?: 2 | 3 }) {
  const tones = {
    oxford: 'border-slate-200 bg-white [&>span>svg]:bg-oxford-50 [&>span>svg]:text-oxford-600',
    brass: 'border-brass-200 bg-brass-50/40 [&>span>svg]:bg-brass-100 [&>span>svg]:text-brass-700',
    amber: 'border-amber-200 bg-amber-50/40 [&>span>svg]:bg-amber-100 [&>span>svg]:text-amber-800',
  } as const;
  return (
    <ul className={cn('grid gap-2.5', columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2')}>
      {rules.map((rule, index) => {
        const Icon = rule.icon;
        return (
          <Reveal as="li" key={rule.title} delay={index * 60}
            className={cn('flex gap-3 rounded-xl border p-3.5', tones[rule.tone ?? 'oxford'])}
          >
            <span className="shrink-0"><Icon className="h-8 w-8 rounded-lg p-1.5" aria-hidden /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-snug text-oxford-900">{rule.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-600">{rule.body}</span>
            </span>
          </Reveal>
        );
      })}
    </ul>
  );
}
