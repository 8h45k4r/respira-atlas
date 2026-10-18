import { useCallback } from 'react';
import { useUrlState } from '@/hooks/useUrlState';
import { useAtlasCatalogue } from '@/hooks/useAtlasCatalogue';
import { DEFAULT_STATE, type AtlasMode } from '@/state/atlas-state';
import { AppHeader } from './AppHeader';
import { ExploreView } from '@/features/atlas/ExploreView';
import { ExplainView } from '@/features/evidence-stories/ExplainView';
import { BriefingView } from '@/features/briefing/BriefingView';
import { MethodsView } from '@/features/methods/MethodsView';
import { CoverageView } from '@/features/methods/CoverageView';
import {
  LoadingState, ErrorState, DemonstrationDataBanner,
} from '@/components/common/states';

export function App() {
  const [state, patch, write] = useUrlState();
  const catalogue = useAtlasCatalogue();

  const setMode = useCallback((mode: AtlasMode) => patch({ mode }), [patch]);
  const reset = useCallback(
    () => write({ ...DEFAULT_STATE, mode: state.mode, geographyMode: state.geographyMode }),
    [write, state.mode, state.geographyMode],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#main" className="skip-link">Skip to main content</a>

      {catalogue.status === 'ready' && catalogue.value.manifest.dataKind !== 'real' ? (
        <DemonstrationDataBanner />
      ) : null}

      <AppHeader
        mode={state.mode}
        onModeChange={setMode}
        manifest={catalogue.status === 'ready' ? catalogue.value.manifest : null}
      />

      <main id="main" className="flex min-h-0 flex-1 flex-col">
        {catalogue.status === 'loading' ? (
          <LoadingState label="Loading the indicator catalogue and coverage matrix…" />
        ) : catalogue.status === 'error' ? (
          <div className="mx-auto w-full max-w-2xl p-6">
            <ErrorState
              title="The atlas data could not be loaded"
              error={catalogue.error}
              onRetry={catalogue.retry}
            />
          </div>
        ) : state.mode === 'explore' ? (
          <ExploreView
            catalogue={catalogue.value}
            state={state}
            onChange={patch}
            onReset={reset}
          />
        ) : state.mode === 'explain' ? (
          <ExplainView catalogue={catalogue.value} state={state} onChange={patch} />
        ) : state.mode === 'briefing' ? (
          <BriefingView catalogue={catalogue.value} state={state} onChange={patch} />
        ) : state.mode === 'coverage' ? (
          <CoverageView catalogue={catalogue.value} state={state} onChange={patch} />
        ) : (
          <MethodsView catalogue={catalogue.value} />
        )}
      </main>

      <AppFooter manifest={catalogue.status === 'ready' ? catalogue.value.manifest : null} />
    </div>
  );
}

function AppFooter({
  manifest,
}: {
  manifest: import('@/data/schemas/manifest').Manifest | null;
}) {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50/60 px-4 py-3 no-print">
      <div className="mx-auto flex max-w-[110rem] flex-wrap items-start gap-x-6 gap-y-2 font-figure text-2xs leading-relaxed text-slate-600">
        <p className="max-w-3xl">
          <span className="font-semibold text-slate-700">
            Public Health Evidence Atlas.
          </span>{' '}
          An independent research tool, built and maintained by a named team. The
          institutions its contributors work for or have worked for have not reviewed,
          endorsed or funded it, and it carries no endorsement from the NHS, the Office
          for Health Improvement and Disparities or the Office for National Statistics.
        </p>
        {manifest ? (
          <p className="max-w-2xl">
            {manifest.licences.observations.attribution}{' '}
            {manifest.licences.boundaries.attribution} Data prepared{' '}
            {manifest.generatedAt.slice(0, 10)}. Interactive charts rendered with
            amCharts 5 under its free licence, which requires the attribution link
            shown on the map.
          </p>
        ) : null}
      </div>
    </footer>
  );
}
