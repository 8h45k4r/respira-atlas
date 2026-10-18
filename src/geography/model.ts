import type { AreaTypeMeta, Manifest } from '@/data/schemas/manifest';
import type { AreaFeature, BoundaryLayer } from '@/data/schemas/geography';

export type GeographyMode = 'administrative' | 'nhs';

export const UK_NATIONS = [
  { code: 'E92000001', name: 'England' },
  { code: 'S92000003', name: 'Scotland' },
  { code: 'W92000004', name: 'Wales' },
  { code: 'N92000002', name: 'Northern Ireland' },
] as const;

export type NationName = (typeof UK_NATIONS)[number]['name'];

export interface AreaRecord {
  readonly code: string;
  readonly name: string;
  readonly nation: string;
  readonly areaTypeKey: string;
  readonly areaTypeLabel: string;
  readonly mode: GeographyMode;
  readonly boundaryVintage: string;
  readonly feature: AreaFeature;
}

/**
 * Registry of areas for one geography level.
 *
 * There is deliberately no parent/child edge between the administrative and NHS
 * trees. An ICB is not inside a local authority and a local authority is not
 * inside an ICB — they are overlapping partitions of England, and the only
 * common ancestor either has is the nation.
 */
export class AreaRegistry {
  private readonly byCode: Map<string, AreaRecord>;

  constructor(
    readonly areaType: AreaTypeMeta,
    readonly layer: BoundaryLayer,
  ) {
    this.byCode = new Map(
      layer.features.map((feature) => [
        feature.properties.code,
        {
          code: feature.properties.code,
          name: feature.properties.name,
          nation: feature.properties.nation,
          areaTypeKey: areaType.key,
          areaTypeLabel: areaType.label,
          mode: areaType.mode,
          boundaryVintage: areaType.boundaryVintage,
          feature,
        },
      ]),
    );
  }

  get(code: string): AreaRecord | undefined {
    return this.byCode.get(code);
  }

  has(code: string): boolean {
    return this.byCode.has(code);
  }

  get size(): number {
    return this.byCode.size;
  }

  all(): AreaRecord[] {
    return [...this.byCode.values()];
  }

  /** Areas within one nation. Used to render out-of-coverage nations distinctly. */
  inNation(nation: string): AreaRecord[] {
    return this.all().filter((a) => a.nation === nation);
  }

  names(): Map<string, string> {
    return new Map([...this.byCode].map(([code, area]) => [code, area.name]));
  }

  sortedByName(): AreaRecord[] {
    return this.all().sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
  }
}

/** Levels available in a mode, ordered from coarsest to finest. */
export function levelsForMode(manifest: Manifest, mode: GeographyMode): AreaTypeMeta[] {
  const order: Record<string, number> = {
    'nhs-region': 0, icb: 1, 'upper-tier': 0, 'lower-tier': 1,
  };
  return Object.values(manifest.areaTypes)
    .filter((areaType) => areaType.mode === mode)
    .sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));
}

export interface BreadcrumbStep {
  readonly label: string;
  readonly code: string | null;
  readonly kind: 'uk' | 'nation' | 'area';
}

/**
 * Breadcrumb for the current selection. A nation step is included only when the
 * selected area genuinely sits inside one nation; NHS geographies are England
 * by construction, so the nation step is England rather than UK-wide.
 */
export function buildBreadcrumb(
  nation: string | null,
  area: AreaRecord | null,
): BreadcrumbStep[] {
  const steps: BreadcrumbStep[] = [{ label: 'United Kingdom', code: null, kind: 'uk' }];
  const nationName = area?.nation ?? nation;
  if (nationName) {
    const match = UK_NATIONS.find((n) => n.name === nationName);
    steps.push({ label: nationName, code: match?.code ?? null, kind: 'nation' });
  }
  if (area) {
    steps.push({ label: area.name, code: area.code, kind: 'area' });
  }
  return steps;
}

export function nationOfCode(code: string): string {
  if (/^E/.test(code)) return 'England';
  if (/^W/.test(code)) return 'Wales';
  if (/^S/.test(code)) return 'Scotland';
  if (/^N/.test(code)) return 'Northern Ireland';
  return 'Unknown';
}

/** Describes why a nation carries no data, for the map legend and tooltips. */
export function nationCoverageState(
  manifest: Manifest,
  nation: string,
): 'covered' | 'not-covered' {
  return manifest.coverage.nationsWithData.includes(nation) ? 'covered' : 'not-covered';
}
