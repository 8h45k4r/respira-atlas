import { Map, FileText, Printer, BookOpen, Grid3x3, Compass } from 'lucide-react';
import type { Manifest } from '@/data/schemas/manifest';
import type { AtlasMode } from '@/state/atlas-state';
import { Badge } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

const MODES: { value: AtlasMode; label: string; icon: typeof Map; hint: string }[] = [
  { value: 'discover', label: 'Start here', icon: Compass, hint: 'Ways into the data' },
  { value: 'explore', label: 'Explore places', icon: Map, hint: 'Map-led workspace' },
  { value: 'explain', label: 'Explain a finding', icon: FileText, hint: 'Build a defensible statement' },
  { value: 'briefing', label: 'Prepare a briefing', icon: Printer, hint: 'Compose a publication figure' },
  { value: 'coverage', label: 'Coverage', icon: Grid3x3, hint: 'What is published where' },
  { value: 'methods', label: 'Methods', icon: BookOpen, hint: 'Definitions and limits' },
];

export function AppHeader({
  mode, onModeChange, manifest,
}: {
  mode: AtlasMode;
  onModeChange: (mode: AtlasMode) => void;
  manifest: Manifest | null;
}) {
  return (
    <header className="border-b border-slate-200 bg-white no-print">
      <div className="mx-auto flex max-w-[110rem] flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 pb-0 pt-3">
        <div className="min-w-0">
          <h1 className="text-[1.0625rem] font-semibold leading-tight tracking-[-0.015em] text-oxford-900">
            Public Health Evidence Atlas
          </h1>
          <p className="mt-0.5 text-xs text-slate-600">
            Understand health across people, places, and time.
          </p>
        </div>
        {manifest ? (
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <Badge tone="brass">
              {manifest.indicators.length} verified indicators
            </Badge>
            <Badge tone="warn">
              {manifest.coverage.nationsWithData.join(', ')} coverage
            </Badge>
            <Badge tone="muted">
              {Object.keys(manifest.topics).length} topics
            </Badge>
          </div>
        ) : null}
      </div>

      <nav aria-label="Workspace" className="mx-auto max-w-[110rem] px-4">
        <ul className="flex flex-wrap items-center gap-0.5">
          {MODES.map((item) => {
            const Icon = item.icon;
            const active = mode === item.value;
            return (
              <li key={item.value}>
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onModeChange(item.value)}
                  title={item.hint}
                  className={cn(
                    'flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700',
                    active
                      ? 'border-brass-700 text-oxford-900'
                      : 'border-transparent text-slate-600 hover:text-oxford-800',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
