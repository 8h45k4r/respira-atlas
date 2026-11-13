import { useMemo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { AreaViewModel } from './map-view-model';
import { SEQUENTIAL_OXFORD, NON_DATA_STYLES } from './palette';

const WIDTH = 64;
const HEIGHT = 92;

/**
 * Locator inset for dataset coverage.
 *
 * The main map is fitted to the covered nation, so the reader needs one glance
 * to see what is left out and why. Covered areas are a flat mid-blue (location,
 * not value); uncovered nations are the same pale fill the main map uses for
 * "not covered by this dataset". Decorative for assistive technology: the
 * sentence beside it carries the meaning.
 */
export function CoverageInset({
  areas, layerKey, coveredLabel,
}: {
  areas: readonly AreaViewModel[];
  layerKey: string;
  /** The nations the dataset covers, as the indicator metadata names them. */
  coveredLabel: string;
}) {
  const { covered, uncovered, uncoveredNations } = useMemo(() => {
    // Fit to the corners of the coordinate bounding box. Fitting to the polygons
    // themselves depends on ring winding, and one ring wound the other way makes
    // d3 fit the whole globe.
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
    for (const area of areas) visit((area.feature.geometry as { coordinates: unknown }).coordinates);
    const corners = {
      type: 'MultiPoint' as const,
      coordinates: [[west, south], [east, north], [west, north], [east, south]],
    };
    const projection = geoMercator().fitExtent([[2, 2], [WIDTH - 2, HEIGHT - 2]], corners as never);
    const generator = geoPath(projection);
    const coveredPaths: string[] = [];
    const uncoveredPaths: string[] = [];
    const nations = new Set<string>();
    for (const area of areas) {
      const d = generator(area.feature as never);
      if (!d) continue;
      const outside = area.render.kind === 'non-data' && area.render.style === 'outsideCoverage';
      if (outside) {
        uncoveredPaths.push(d);
        nations.add(area.nation);
      } else {
        coveredPaths.push(d);
      }
    }
    return {
      covered: coveredPaths.join(' '),
      uncovered: uncoveredPaths.join(' '),
      uncoveredNations: [...nations].sort(),
    };
    // Geometry and coverage are fixed for a layer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerKey]);

  if (uncoveredNations.length === 0) return null;

  return (
    <div className="pointer-events-none flex max-w-[15rem] items-start gap-2 rounded-md border border-slate-200 bg-white/90 p-1.5 shadow-sm">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="shrink-0" aria-hidden focusable="false">
        <path d={uncovered} fill={NON_DATA_STYLES.outsideCoverage.fill} stroke="#c9c6c0" strokeWidth={0.4} />
        <path d={covered} fill={SEQUENTIAL_OXFORD[2]} stroke={SEQUENTIAL_OXFORD[2]} strokeWidth={0.3} />
      </svg>
      <p className="pt-0.5 font-figure text-2xs leading-snug text-slate-700">
        <span className="font-semibold text-oxford-900">{coveredLabel} only.</span>{' '}
        {listNations(uncoveredNations)} {uncoveredNations.length === 1 ? 'is' : 'are'} not in
        this dataset — a coverage gap, not low values.
      </p>
    </div>
  );
}

function listNations(nations: readonly string[]): string {
  if (nations.length <= 1) return nations.join('');
  return `${nations.slice(0, -1).join(', ')} and ${nations[nations.length - 1]}`;
}
