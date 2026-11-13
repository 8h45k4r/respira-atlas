import { useEffect, useState } from 'react';
import type { StoryGraphic } from './types';
import {
  StatCallouts, Waffle, RangeBar, ContrastCards,
} from '@/components/infographics/infographics';

/** Renders a story step's computed graphic. */
export function StoryGraphicView({ graphic }: { graphic: StoryGraphic }) {
  switch (graphic.kind) {
    case 'stats':
      return <StatCallouts items={graphic.items} />;
    case 'split':
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 font-figure text-2xs font-semibold text-slate-600">{graphic.caption}</p>
          <Waffle segments={graphic.segments} caption={graphic.caption} />
        </div>
      );
    case 'range':
      return (
        <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
          {graphic.ranges.map((range) => <RangeBar key={range.measure} {...range} />)}
        </div>
      );
    case 'contrast':
      return <ContrastCards is={graphic.is} isNot={graphic.isNot} />;
    default:
      return null;
  }
}

/**
 * A small illustration per story for the index: each draws the story's idea,
 * not its data, so it never carries a number.
 */
export function StoryGlyph({ id }: { id: string }) {
  const common = 'h-16 w-24 shrink-0';
  switch (id) {
    case 'variation-vs-evidence':
      return (
        <svg viewBox="0 0 96 64" className={common} aria-hidden>
          <line x1="50" y1="4" x2="50" y2="60" stroke="#3f3c39" strokeDasharray="3 2" />
          {[12, 22, 32, 42, 52].map((y, i) => {
            const cx = [70, 58, 52, 46, 30][i];
            const w = [14, 18, 20, 18, 12][i];
            const filled = i === 0 || i === 4;
            return (
              <g key={y}>
                <line x1={cx - w} y1={y} x2={cx + w} y2={y} stroke="#2a4c7f" strokeWidth="1.5" />
                <circle cx={cx} cy={y} r="3.4" fill={filled ? '#002147' : '#fff'} stroke="#002147" strokeWidth="1.5" />
              </g>
            );
          })}
        </svg>
      );
    case 'reading-absence':
      return (
        <svg viewBox="0 0 96 64" className={common} aria-hidden>
          <defs>
            <pattern id="g-hatch" width="4" height="4" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="4" stroke="#94a3b8" /></pattern>
            <pattern id="g-diag" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#c9c6c0" /></pattern>
          </defs>
          <rect x="6" y="6" width="38" height="24" rx="3" fill="#44679c" />
          <rect x="52" y="6" width="38" height="24" rx="3" fill="url(#g-hatch)" stroke="#a3a099" />
          <rect x="6" y="34" width="38" height="24" rx="3" fill="url(#g-diag)" stroke="#dcd9d4" />
          <rect x="52" y="34" width="38" height="24" rx="3" fill="#dde7f1" stroke="#a9c0da" />
          <text x="71" y="51" textAnchor="middle" fontSize="12" fontWeight="700" fill="#002147">0</text>
        </svg>
      );
    case 'two-measures':
      return (
        <svg viewBox="0 0 96 64" className={common} aria-hidden>
          <line x1="8" y1="58" x2="90" y2="58" stroke="#c9c6c0" />
          <line x1="8" y1="6" x2="8" y2="58" stroke="#c9c6c0" />
          {[[16, 48], [24, 44], [30, 40], [38, 42], [46, 32], [54, 34], [60, 26], [68, 28], [76, 18], [84, 20], [42, 50], [70, 38]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#2a4c7f" opacity="0.85" />
          ))}
        </svg>
      );
    case 'no-single-number':
      return (
        <svg viewBox="0 0 96 64" className={common} aria-hidden>
          <rect x="12" y="14" width="22" height="44" rx="2" fill="#2a4c7f" />
          <rect x="40" y="22" width="22" height="36" rx="2" fill="#a9791f" />
          <rect x="68" y="18" width="22" height="40" rx="2" fill="none" stroke="#a3a099" strokeDasharray="3 2" />
          <line x1="70" y1="20" x2="88" y2="56" stroke="#9a3412" strokeWidth="2" />
          <line x1="88" y1="20" x2="70" y2="56" stroke="#9a3412" strokeWidth="2" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * The section the reader is in: the last one whose top has passed 35% of the
 * viewport height, or the first when the page is above them all. Derived from
 * scroll position, so it is right in both directions.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join('|');
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current = ids[0] ?? null;
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}
