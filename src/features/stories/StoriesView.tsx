import { useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft, BookOpen, Share2, Check } from 'lucide-react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import { stateToUrl } from '@/state/atlas-state';
import { STORIES } from './stories';
import { isUnavailable, type StoryContext, type StorySpec } from './types';
import { useStoryDatasets } from './useStoryDatasets';
import { StoryFigure } from './StoryFigure';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { LoadingState, ErrorState, UnsupportedState } from '@/components/common/states';

/**
 * Evidence stories.
 *
 * Each story is a question worked end to end: the pattern, the comparison, the
 * uncertainty, what cannot be concluded, and a link to the exact live view it
 * was built from. The prose frame is authored; every number in it is computed
 * from the observations when the page renders.
 */
export function StoriesView({
  catalogue, state, onChange,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  onChange: (patch: Partial<AtlasState>) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const spec = useMemo(
    () => STORIES.find((candidate) => candidate.id === openId) ?? null,
    [openId],
  );

  if (!spec) {
    return <StoryIndex onOpen={setOpenId} />;
  }
  return (
    <StoryReader
      spec={spec}
      catalogue={catalogue}
      state={state}
      onChange={onChange}
      onBack={() => setOpenId(null)}
    />
  );
}

function StoryIndex({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-[52rem] px-4 py-8">
      <p className="label-caps">Evidence stories</p>
      <h2 className="mt-1 text-[1.45rem] font-semibold leading-[1.2] tracking-[-0.02em] text-oxford-800">
        Questions worked through end to end
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-700">
        Each story takes a question these data can genuinely speak to, shows the pattern,
        tests how much of it survives the uncertainty, and is explicit about what it
        cannot establish. The framing is written in advance; every figure in the prose is
        computed from the published observations when you open it, so a story cannot
        drift away from the data it describes.
      </p>

      <ul className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
        {STORIES.map((story) => (
          <li key={story.id}>
            <button
              type="button"
              onClick={() => onOpen(story.id)}
              className="group block w-full py-4 text-left focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-brass-600"
            >
              <div className="flex items-start gap-3">
                <BookOpen
                  className="mt-0.5 h-4 w-4 shrink-0 text-brass-600"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-oxford-800 group-hover:underline">
                    {story.title}
                  </h3>
                  <p className="mt-0.5 text-xs italic leading-relaxed text-slate-600">
                    {story.question}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                    {story.standfirst}
                  </p>
                  <p className="mt-2">
                    <Badge tone="brass">{story.teaches}</Badge>
                  </p>
                </div>
                <ArrowRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-brass-600"
                  aria-hidden
                />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StoryReader({
  spec, catalogue, state, onChange, onBack,
}: {
  spec: StorySpec;
  catalogue: Catalogue;
  state: AtlasState;
  onChange: (patch: Partial<AtlasState>) => void;
  onBack: () => void;
}) {
  const data = useStoryDatasets(catalogue, spec);
  const [copied, setCopied] = useState(false);

  const built = useMemo(() => {
    if (data.status !== 'ready') return null;
    const names = new Map<string, string>();
    for (const dataset of Object.values(data.datasets)) {
      for (const [code, name] of dataset.registry.names()) names.set(code, name);
    }
    names.set(catalogue.manifest.coverage.benchmark.areaCode,
      catalogue.manifest.coverage.benchmark.label);

    const context: StoryContext = {
      manifest: catalogue.manifest,
      datasets: data.datasets,
      areaName: (code) => names.get(code) ?? code,
    };
    return { context, result: spec.build(context) };
  }, [data, spec, catalogue.manifest]);

  const back = (
    <Button variant="ghost" size="sm" onClick={onBack} className="no-print">
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      All stories
    </Button>
  );

  if (data.status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-[52rem] px-4 py-6">
        {back}
        <LoadingState label={`Building “${spec.title}” from the published data…`} />
      </div>
    );
  }
  if (data.status === 'error') {
    return (
      <div className="mx-auto w-full max-w-[52rem] px-4 py-6">
        {back}
        <ErrorState
          title="This story's data could not be loaded"
          error={data.error}
          onRetry={data.retry}
        />
      </div>
    );
  }
  if (data.status === 'unsupported') {
    return (
      <div className="mx-auto w-full max-w-[52rem] px-4 py-6">
        {back}
        <UnsupportedState title="This story is not available" explanation={data.reason} />
      </div>
    );
  }
  if (!built || isUnavailable(built.result)) {
    return (
      <div className="mx-auto w-full max-w-[52rem] px-4 py-6">
        {back}
        <UnsupportedState
          title="This story is not available"
          explanation={
            built && isUnavailable(built.result)
              ? built.result.reason
              : 'The data no longer support this story.'
          }
        />
      </div>
    );
  }

  const content = built.result;
  const liveState: AtlasState = { ...state, ...content.liveView } as AtlasState;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(stateToUrl(liveState));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setCopied(false); }
  };

  return (
    <article className="mx-auto w-full max-w-[52rem] px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {back}
        <div className="flex items-center gap-1.5 no-print">
          <Button variant="outline" size="sm" onClick={share}>
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden />
                    : <Share2 className="h-3.5 w-3.5" aria-hidden />}
            {copied ? 'Link copied' : 'Share'}
          </Button>
          <Button variant="brass" size="sm" onClick={() => onChange(content.liveView)}>
            Open this view
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <header className="mt-3">
        <p className="label-caps">Evidence story</p>
        <h2 className="mt-1 text-[1.45rem] font-semibold leading-[1.2] tracking-[-0.02em] text-oxford-800">
          {spec.title}
        </h2>
        <p className="mt-2 text-sm italic leading-relaxed text-slate-600">{spec.question}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{spec.standfirst}</p>
      </header>

      <dl className="mt-4 grid grid-cols-[minmax(5.5rem,auto)_1fr] gap-x-3 gap-y-1 border-y border-slate-200 py-3 font-figure text-2xs">
        {([
          ['Measure', content.setup.measure],
          ['Population', content.setup.population],
          ['Place', content.setup.place],
          ['Period', content.setup.period],
          ['Source', content.setup.source],
        ] as const).map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-semibold uppercase tracking-[0.05em] text-slate-500">
              {label}
            </dt>
            <dd className="text-slate-700">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 space-y-7">
        {content.steps.map((step, index) => (
          <section key={step.heading} aria-labelledby={`step-${index}`}>
            <h3
              id={`step-${index}`}
              className="flex items-baseline gap-2 text-sm font-semibold text-oxford-800"
            >
              <span className="font-figure text-2xs tabular-nums text-brass-600">
                {String(index + 1).padStart(2, '0')}
              </span>
              {step.heading}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{step.body}</p>
            {step.figure ? (
              <StoryFigure figure={step.figure} context={built.context} />
            ) : null}
            {step.note ? (
              <p className="mt-2 border-l-2 border-slate-300 pl-3 text-xs leading-relaxed text-slate-600">
                {step.note}
              </p>
            ) : null}
          </section>
        ))}
      </div>

      <section
        aria-labelledby="cannot-heading"
        className="mt-8 border-l-2 border-brass-500 bg-brass-50/50 py-3 pl-3 pr-3"
      >
        <h3 id="cannot-heading" className="label-caps mb-2">
          What this does not establish
        </h3>
        <ul className="list-outside list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-brass-900">
          {content.cannotConclude.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section aria-labelledby="next-heading" className="mt-5">
        <h3 id="next-heading" className="label-caps mb-2">
          What to look at next
        </h3>
        <ul className="list-outside list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-700">
          {content.furtherQuestions.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <footer className="mt-7 border-t border-slate-200 pt-3">
        <p className="font-figure text-2xs leading-relaxed text-slate-500">
          Every figure quoted above is computed from the published observations at the
          moment this page is rendered. The question and the framing are written in
          advance; the numbers are not. Open the live view to reproduce any of it, or
          export a figure with its full source and method notes attached.
        </p>
      </footer>
    </article>
  );
}
