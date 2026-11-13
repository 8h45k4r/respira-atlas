import { useMemo, useState } from 'react';
import {
  ArrowRight, ArrowLeft, Share2, Check, Lightbulb, Compass, Sigma, Unlink, Sparkles,
  Ruler, Users, MapPinned, CalendarRange, Database, Telescope, Search, XCircle, Info,
  FileText, ChevronDown,
} from 'lucide-react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import { stateToUrl } from '@/state/atlas-state';
import { STORIES } from './stories';
import {
  isUnavailable, type StoryContext, type StorySpec, type StoryContent, type StoryStep,
} from './types';
import { StoryGraphicView, StoryGlyph, useActiveSection } from './StoryGraphics';
import { Reveal } from '@/components/motion/motion';
import { IconCards } from '@/components/infographics/infographics';
import { cn } from '@/lib/utils';
import { useStoryDatasets } from './useStoryDatasets';
import { StoryFigure } from './StoryFigure';
import { Button } from '@/components/ui/button';
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
    <div className="mx-auto w-full max-w-[60rem] px-4 py-8">
      <Reveal as="header">
        <p className="label-caps">Evidence stories</p>
        <h2 className="mt-1 text-[1.6rem] font-semibold leading-[1.15] tracking-[-0.02em] text-oxford-800">
          Questions worked through end to end
        </h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            { icon: Compass, text: 'The pattern' },
            { icon: Sigma, text: 'What survives the uncertainty' },
            { icon: Unlink, text: 'What it cannot establish' },
          ].map(({ icon: Icon, text }, index) => (
            <span key={text} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-figure text-2xs text-slate-700">
              <span className="font-semibold text-brass-600">{index + 1}</span>
              <Icon className="h-3.5 w-3.5 text-oxford-500" aria-hidden />{text}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-200 bg-brass-50 px-2.5 py-1 font-figure text-2xs text-brass-800">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />Every number computed live from the data
          </span>
        </div>
        <p className="sr-only">
          Each story takes a question these data can genuinely speak to, shows the pattern,
          tests how much of it survives the uncertainty, and is explicit about what it
          cannot establish. The framing is written in advance; every figure is computed from
          the published observations when you open it.
        </p>
      </Reveal>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {STORIES.map((story, index) => (
          <Reveal as="li" key={story.id} delay={index * 90}>
            <button
              type="button"
              onClick={() => onOpen(story.id)}
              className="group flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition
                         hover:-translate-y-0.5 hover:border-brass-400 hover:shadow-md
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-600"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-figure text-2xs font-semibold text-brass-600">
                  Story {String(index + 1).padStart(2, '0')}
                </span>
                <StoryGlyph id={story.id} />
              </div>
              <h3 className="mt-1 text-base font-semibold leading-snug text-oxford-800 group-hover:underline">
                {story.title}
              </h3>
              <p className="mt-1 text-sm italic leading-snug text-slate-600">{story.question}</p>
              <p className="sr-only">{story.standfirst}</p>
              <span className="mt-auto pt-3">
                <span className="inline-flex items-start gap-1.5 rounded-lg bg-brass-50 px-2.5 py-1.5 text-2xs font-medium leading-snug text-brass-900">
                  <Lightbulb className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />{story.teaches}
                </span>
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-oxford-700 group-hover:text-brass-700">
                Read the story <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </button>
          </Reveal>
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
    <StoryArticle
      spec={spec}
      content={content}
      context={built.context}
      back={back}
      copied={copied}
      onShare={share}
      onOpenView={() => onChange(content.liveView)}
    />
  );
}

function StoryArticle({
  spec, content, context, back, copied, onShare, onOpenView,
}: {
  spec: StorySpec;
  content: StoryContent;
  context: StoryContext;
  back: React.ReactNode;
  copied: boolean;
  onShare: () => void;
  onOpenView: () => void;
}) {
  const stepIds = content.steps.map((_, index) => `story-step-${index}`);
  const active = useActiveSection(stepIds);
  const activeIndex = active ? stepIds.indexOf(active) : 0;

  return (
    <article className="mx-auto w-full max-w-[56rem] px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {back}
        <div className="flex items-center gap-1.5 no-print">
          <Button variant="outline" size="sm" onClick={onShare}>
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden />
                    : <Share2 className="h-3.5 w-3.5" aria-hidden />}
            {copied ? 'Link copied' : 'Share'}
          </Button>
          <Button variant="brass" size="sm" onClick={onOpenView}>
            Open this view
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <Reveal as="header" className="mt-4">
        <p className="label-caps">Evidence story</p>
        <h2 className="mt-1 text-[1.7rem] font-semibold leading-[1.12] tracking-[-0.02em] text-oxford-800">
          {spec.title}
        </h2>
        <p className="mt-2 border-l-4 border-brass-400 pl-3 text-lg italic leading-snug text-slate-700">
          {spec.question}
        </p>
        <p className="sr-only">{spec.standfirst}</p>
        <div className="mt-3 inline-flex items-start gap-2 rounded-lg bg-oxford-800 px-3 py-2 text-white">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brass-300" aria-hidden />
          <span className="text-sm font-medium leading-snug">{spec.teaches}</span>
        </div>
        <dl className="mt-3 flex flex-wrap gap-1.5 font-figure text-2xs">
          {([
            [Ruler, 'Measure', content.setup.measure],
            [Users, 'Population', content.setup.population],
            [MapPinned, 'Place', content.setup.place],
            [CalendarRange, 'Period', content.setup.period],
            [Database, 'Source', content.setup.source],
          ] as const).map(([Icon, label, value]) => (
            <div key={label} title={`${label}: ${value}`}
              className="inline-flex max-w-[18rem] items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5">
              <dt className="sr-only">{label}</dt>
              <Icon className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              <dd className="truncate text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* Step tracker: where you are in the argument. */}
      <nav aria-label="Story steps" className="sticky top-0 z-20 -mx-4 mt-5 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur no-print">
        <ol className="flex items-center gap-1">
          {content.steps.map((step, index) => (
            <li key={step.heading} className="flex min-w-0 flex-1 items-center gap-1">
              <a
                href={`#${stepIds[index]}`}
                title={step.heading}
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-figure text-2xs font-semibold transition-colors',
                  index < activeIndex ? 'border-oxford-700 bg-oxford-700 text-white'
                    : index === activeIndex ? 'border-brass-500 bg-brass-500 text-white'
                      : 'border-slate-300 bg-white text-slate-500',
                )}
              >
                {index + 1}
              </a>
              <span className={cn('hidden truncate font-figure text-2xs md:block', index === activeIndex ? 'font-semibold text-oxford-900' : 'text-slate-500')}>
                {step.heading}
              </span>
              {index < content.steps.length - 1 ? (
                <span className="mx-1 h-0.5 min-w-3 flex-1 rounded bg-slate-200">
                  <span className={cn('block h-full rounded bg-oxford-700 transition-all duration-500', index < activeIndex ? 'w-full' : 'w-0')} />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>

      <ol className="relative mt-6 space-y-8 border-l-2 border-slate-200 pl-6">
        {content.steps.map((step, index) => (
          <StoryStepView key={step.heading} id={stepIds[index]} index={index} step={step} context={context} />
        ))}
      </ol>

      <Reveal as="section" className="mt-10">
        <h3 id="cannot-heading" className="mb-3 flex items-center gap-2 text-base font-semibold text-brass-900">
          <Unlink className="h-4 w-4 text-brass-600" aria-hidden />
          What this does not establish
        </h3>
        <IconCards items={content.cannotConclude} icon={XCircle} tone="brass" />
      </Reveal>

      <Reveal as="section" className="mt-7">
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-oxford-800">
          <Telescope className="h-4 w-4 text-oxford-500" aria-hidden />
          What to look at next
        </h3>
        <IconCards items={content.furtherQuestions} icon={Search} tone="oxford" columns={1} />
      </Reveal>

      <Reveal className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-oxford-800 px-4 py-3 text-white no-print">
        <span className="inline-flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-brass-300" aria-hidden />
          Every number above is computed from the published data as you read it.
        </span>
        <Button variant="brass" size="sm" onClick={onOpenView}>
          Open the live view <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </Reveal>
      <p className="sr-only">
        Every figure quoted above is computed from the published observations at the
        moment this page is rendered. The question and the framing are written in
        advance; the numbers are not.
      </p>
    </article>
  );
}

function StoryStepView({ id, index, step, context }: {
  id: string; index: number; step: StoryStep; context: StoryContext;
}) {
  const [open, setOpen] = useState(false);
  const noteLead = step.note ? firstSentence(step.note) : null;
  return (
    <Reveal as="li" className="relative">
      <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-16">
        <span className="absolute -left-[39px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-oxford-800 font-figure text-2xs font-semibold text-white shadow">
          {index + 1}
        </span>
        <h3 id={`${id}-h`} className="text-lg font-semibold leading-snug text-oxford-800">
          {step.heading}
        </h3>
        {step.graphic ? <div className="mt-3"><StoryGraphicView graphic={step.graphic} /></div> : null}
        {step.figure ? <StoryFigure figure={step.figure} context={context} /> : null}
        {noteLead ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-snug text-slate-700">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass-600" aria-hidden />
            {noteLead}
          </p>
        ) : null}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="mt-2 inline-flex items-center gap-1 rounded font-figure text-2xs font-semibold text-oxford-700 hover:text-brass-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700 no-print"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {open ? 'Hide the explanation' : 'Read the explanation'}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {/* Always in the page: read by screen readers, printed, and checked by tests. */}
        <div className={cn(open ? 'mt-2 space-y-2' : 'sr-only print:not-sr-only')}>
          <p className="text-sm leading-relaxed text-slate-700">{step.body}</p>
          {step.note ? (
            <p className="border-l-2 border-slate-300 pl-3 text-xs leading-relaxed text-slate-600">{step.note}</p>
          ) : null}
        </div>
      </section>
    </Reveal>
  );
}

function firstSentence(text: string): string {
  const match = text.match(/^(.+?[.?!])(\s|$)/s);
  return match ? match[1] : text;
}
