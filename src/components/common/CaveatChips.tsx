import {
  MapPinOff, Unlink, Layers, CircleDashed, MoveHorizontal, ListOrdered, ClipboardList,
  Users, Sigma, TriangleAlert,
} from 'lucide-react';

/**
 * A caveat as a short, scannable chip. Each kind has one icon everywhere in
 * the atlas, so a reader learns the vocabulary once.
 */
export type CaveatKind =
  | 'coverage'     // the dataset leaves places out
  | 'not-causal'   // association or description, not cause
  | 'pooled'       // overlapping multi-year periods
  | 'gaps'         // missing is not zero
  | 'interval'     // uncertainty, interval reading
  | 'rank'         // order is not performance
  | 'recording'    // recorded, not true, prevalence
  | 'areas'        // area-level, not people
  | 'test'         // what is and is not a significance test
  | 'warning';     // anything else that must be read

export interface Caveat {
  readonly kind: CaveatKind;
  /** Three to six words. The full reasoning lives in the figure's limitation. */
  readonly label: string;
}

const ICONS: Record<CaveatKind, typeof Users> = {
  coverage: MapPinOff,
  'not-causal': Unlink,
  pooled: Layers,
  gaps: CircleDashed,
  interval: MoveHorizontal,
  rank: ListOrdered,
  recording: ClipboardList,
  areas: Users,
  test: Sigma,
  warning: TriangleAlert,
};

export function CaveatChips({ caveats }: { caveats: readonly Caveat[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Read this figure with care">
      {caveats.map((caveat) => {
        const Icon = ICONS[caveat.kind];
        return (
          <li
            key={`${caveat.kind}-${caveat.label}`}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2 py-0.5 font-figure text-2xs text-amber-950"
          >
            <Icon className="h-3 w-3 shrink-0 text-amber-700" aria-hidden />
            {caveat.label}
          </li>
        );
      })}
    </ul>
  );
}
