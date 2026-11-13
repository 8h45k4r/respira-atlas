import { useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { loadBoundaryLayer } from '@/data/loader';
import type { BoundaryLayer } from '@/data/schemas/geography';
import { useInView } from '@/components/motion/motion';
import { cn } from '@/lib/utils';

const W = 260;
const H = 330;

/**
 * The dataset's coverage as a picture: the UK's four nations, the covered
 * one(s) filled, the rest hatched as "not covered". Drawn from the published
 * nations layer, so the shapes are the real boundaries, not an icon.
 */
export function CoverageMap({ file, covered }: { file: string; covered: readonly string[] }) {
  const [layer, setLayer] = useState<BoundaryLayer | null>(null);
  const [ref, inView] = useInView<HTMLDivElement>();

  useEffect(() => {
    const controller = new AbortController();
    loadBoundaryLayer(file, controller.signal).then(setLayer).catch(() => setLayer(null));
    return () => controller.abort();
  }, [file]);

  const shapes = useMemo(() => {
    if (!layer) return null;
    // Fit to the bounding-box corners: robust to ring winding.
    let west = Infinity; let east = -Infinity; let south = Infinity; let north = -Infinity;
    const visit = (value: unknown): void => {
      if (!Array.isArray(value)) return;
      if (typeof value[0] === 'number' && typeof value[1] === 'number') {
        west = Math.min(west, value[0]); east = Math.max(east, value[0]);
        south = Math.min(south, value[1]); north = Math.max(north, value[1]);
        return;
      }
      for (const child of value) visit(child);
    };
    for (const feature of layer.features) visit((feature.geometry as { coordinates: unknown }).coordinates);
    const projection = geoMercator().fitExtent(
      [[6, 6], [W - 6, H - 6]],
      { type: 'MultiPoint', coordinates: [[west, south], [east, north], [west, north], [east, south]] } as never,
    );
    const path = geoPath(projection);
    return layer.features.map((feature) => {
      const d = path(feature as never) ?? '';
      const [cx, cy] = path.centroid(feature as never);
      return { name: feature.properties.name, d, cx, cy, covered: covered.includes(feature.properties.nation) };
    });
  }, [layer, covered]);

  const uncovered = shapes?.filter((shape) => !shape.covered).map((shape) => shape.name) ?? [];

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[18rem]" role="img"
        aria-label={`Coverage: ${covered.join(', ')} has data; ${uncovered.join(', ') || 'other nations'} not covered by this dataset.`}
      >
        <defs>
          <linearGradient id="cov-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#44679c" />
            <stop offset="1" stopColor="#002147" />
          </linearGradient>
          <pattern id="cov-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="#f8f8f7" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="#c9c6c0" strokeWidth="1.2" />
          </pattern>
        </defs>
        {shapes ? shapes.map((shape, index) => (
          <path
            key={shape.name}
            d={shape.d}
            fill={shape.covered ? 'url(#cov-fill)' : 'url(#cov-hatch)'}
            stroke={shape.covered ? '#ffffff' : '#c9c6c0'}
            strokeWidth={0.8}
            className={cn(inView ? 'cell-pop' : 'opacity-0')}
            style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${index * 140}ms` }}
          />
        )) : (
          <rect x="60" y="40" width="140" height="250" rx="12" fill="#f0efed" className="animate-pulse" />
        )}
        {shapes?.filter((shape) => shape.covered).map((shape) => (
          <g key={`${shape.name}-label`} className={inView ? 'reveal reveal-in' : 'opacity-0'} style={{ animationDelay: '700ms' }}>
            <rect x={shape.cx - 34} y={shape.cy - 11} width="68" height="20" rx="10" fill="#ffffff" opacity="0.95" />
            <text x={shape.cx} y={shape.cy + 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="#002147">
              {shape.name}
            </text>
          </g>
        ))}
      </svg>
      <ul className="mt-2 space-y-1 font-figure text-2xs">
        <li className="flex items-center gap-1.5 text-oxford-900">
          <span aria-hidden className="h-3 w-3 rounded-sm bg-gradient-to-b from-oxford-500 to-oxford-800" />
          <span><span className="font-semibold">{covered.join(', ')}</span>: published data</span>
        </li>
        {uncovered.length > 0 ? (
          <li className="flex items-center gap-1.5 text-slate-600">
            <span aria-hidden className="h-3 w-3 rounded-sm border border-slate-300 bg-[repeating-linear-gradient(45deg,#c9c6c0_0_1px,#f8f8f7_1px_4px)]" />
            {uncovered.join(', ')}: not covered, not zero
          </li>
        ) : null}
      </ul>
    </div>
  );
}
