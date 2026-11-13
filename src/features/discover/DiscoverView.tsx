import { useMemo } from 'react';
import {
  MapPin, Layers, Users, BookOpen, ArrowRight, Clock, MapPinOff, ShieldCheck, Ban, Sparkles, Info,
} from 'lucide-react';
import { Reveal, CountUp } from '@/components/motion/motion';
import { CoverageMap } from '@/components/infographics/CoverageMap';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import { Button } from '@/components/ui/button';
import { AreaSearch } from '@/components/common/AreaSearch';
import { formatDate } from '@/lib/utils';
import { useSettlementIndex } from '@/hooks/useSettlementIndex';
import { useState } from 'react';

/**
 * The way in.
 *
 * Every question, date and count on this page is read from the prepared
 * dataset. Nothing here is a worked example written in advance: a starting
 * question names an indicator only if that indicator is published, and names a
 * period only if observations exist for it. A homepage that promises findings
 * the data cannot support is the first place an atlas loses its credibility.
 */
export function DiscoverView({
  catalogue, state, onChange,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  onChange: (patch: Partial<AtlasState>) => void;
}) {
  const { manifest, indicators } = catalogue;
  const [wantSettlements, setWantSettlements] = useState(false);
  const settlements = useSettlementIndex(
    wantSettlements, manifest, catalogue.search.settlementFile,
  );

  const topics = useMemo(
    () => Object.values(manifest.topics).sort((a, b) => b.indicatorCount - a.indicatorCount),
    [manifest.topics],
  );

  /** Starting questions, each built from a real indicator and its real latest period. */
  const questions = useMemo(() => {
    const pick = (id: number) => indicators.find((indicator) => indicator.id === id);
    const candidates = [
      { id: 90366, template: (n: string, p: string) => `How long do people live, and where is ${n.toLowerCase()} shortest? (${p})` },
      { id: 93721, template: (n: string, p: string) => `Which places have the highest ${n.toLowerCase()}? (${p})` },
      { id: 41001, template: (n: string, p: string) => `How does the ${n.toLowerCase()} vary between local authorities? (${p})` },
      { id: 92196, template: (n: string, p: string) => `Where is ${n.toLowerCase()} highest, and is the difference supported by the intervals? (${p})` },
      { id: 93577, template: (n: string, p: string) => `How do ${n.toLowerCase()} differ between integrated care boards? (${p})` },
      { id: 93700, template: (n: string, p: string) => `How does ${n.toLowerCase()} vary, and how does that sit alongside health outcomes? (${p})` },
    ];
    return candidates.flatMap((candidate) => {
      const indicator = pick(candidate.id);
      if (!indicator) return [];
      const geographyKey = Object.keys(indicator.geographies)[0];
      const geography = indicator.geographies[geographyKey];
      if (!geography?.latestPeriod) return [];
      return [{
        id: indicator.id,
        topic: indicator.topic,
        topicLabel: indicator.topicLabel,
        areaTypeKey: geographyKey,
        text: candidate.template(indicator.shortName, geography.latestPeriod),
      }];
    });
  }, [indicators]);

  /** Most recently published by the source — not the date this site was built. */
  const recent = useMemo(
    () =>
      [...indicators]
        .filter((indicator) => indicator.lastUploadedAt)
        .sort((a, b) => (b.lastUploadedAt ?? '').localeCompare(a.lastUploadedAt ?? ''))
        .slice(0, 5),
    [indicators],
  );

  const open = (patch: Partial<AtlasState>) =>
    onChange({ mode: 'explore', ...patch });

  const maxTopic = Math.max(1, ...topics.map((topic) => topic.indicatorCount));
  const areaCount = Object.values(manifest.areaTypes).length;

  return (
    <div className="shell py-8">
      {/* ------------------------------------------------------------- hero */}
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Reveal as="div">
          <h2 className="text-[2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-oxford-800 sm:text-[2.4rem]">
            What would you like to understand about public health?
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { value: manifest.indicators.length, label: 'verified indicators' },
              { value: Object.keys(manifest.topics).length, label: 'topics' },
              { value: manifest.sourceProfiles.length, label: 'OHID profiles' },
              { value: areaCount, label: 'geography levels' },
            ].map((stat, index) => (
              <Reveal key={stat.label} delay={150 + index * 90}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
              >
                <CountUp value={stat.value} className="block text-3xl font-semibold leading-none text-oxford-900" />
                <span className="mt-1 block font-figure text-2xs text-slate-500">{stat.label}</span>
              </Reveal>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[
              { icon: MapPinOff, text: `${manifest.coverage.nationsWithData.join(', ')} only` },
              { icon: ShieldCheck, text: 'Intervals and caveats as published' },
              { icon: Ban, text: 'No UK-wide benchmark' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 rounded-full border border-brass-200 bg-brass-50 px-2.5 py-1 font-figure text-2xs text-brass-900">
                <Icon className="h-3.5 w-3.5" aria-hidden />{text}
              </span>
            ))}
          </div>
          <p className="sr-only">
            {manifest.indicators.length} verified indicators across{' '}
            {Object.keys(manifest.topics).length} topics, drawn from the{' '}
            {manifest.licences.observations.publisher} and published with the uncertainty,
            definitions and coverage limits the source supplies. Coverage.{' '}
            {manifest.coverage.statement}
          </p>
        </Reveal>
        <Reveal delay={200} className="justify-self-center">
          <CoverageMap file={manifest.nationsLayer.file} covered={manifest.coverage.nationsWithData} />
        </Reveal>
      </section>

      {/* ------------------------------------------------------ entry points */}
      <section aria-labelledby="entry-heading" className="mt-10">
        <h3 id="entry-heading" className="label-caps mb-3">
          Four ways in
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          <EntryCard
            index={0}
            icon={MapPin}
            title="Explore a place"
            body="A council, an ICB or a town: every indicator for it."
            action={
              <div className="mt-3">
                <AreaSearch
                  entries={catalogue.search.entries}
                  settlements={settlements.entries}
                  settlementsLoading={settlements.loading}
                  onFirstInput={() => setWantSettlements(true)}
                  mode={state.geographyMode}
                  areaTypeKey={null}
                  placeholder="Search a place, authority or area code"
                  onResolve={(resolution) =>
                    open({
                      selectedAreaCode: resolution.entry.code,
                      areaTypeKey: resolution.entry.areaTypeKey,
                      nationFocus: resolution.entry.nation,
                    })
                  }
                />
              </div>
            }
          />
          <EntryCard
            index={1}
            icon={Layers}
            title="Explore a health topic"
            body="Indicators per topic. Pick one to compare places."
            action={
              <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {topics.map((topic) => (
                  <li key={topic.key}>
                    <button
                      type="button"
                      onClick={() => open({ topic: topic.key, indicatorId: null })}
                      className="group flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-2xs
                                 font-medium text-oxford-800 hover:bg-oxford-50
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-600"
                    >
                      <span className="w-24 shrink-0 truncate group-hover:underline">{topic.short}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="grow-x block h-full rounded-full bg-oxford-600"
                          style={{ width: `${(topic.indicatorCount / maxTopic) * 100}%` }}
                        />
                      </span>
                      <span className="w-4 text-right tabular-nums text-slate-500">{topic.indicatorCount}</span>
                    </button>
                  </li>
                ))}
              </ul>
            }
          />
          <EntryCard
            index={2}
            icon={Users}
            title="Compare populations"
            body="The groups the publisher supplies, and where it supplies none."
            action={
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => open({ topic: 'population-health', indicatorId: 90366, sex: 'Female' })}
              >
                Start with life expectancy by sex
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            }
          />
          <EntryCard
            index={3}
            icon={BookOpen}
            title="Follow an evidence story"
            body="Pattern → uncertainty → what it cannot establish."
            action={
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onChange({ mode: 'stories' })}
              >
                Read the evidence stories
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            }
          />
        </ul>
      </section>

      {/* -------------------------------------------------- starting questions */}
      {questions.length > 0 ? (
        <section aria-labelledby="questions-heading" className="mt-10">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 id="questions-heading" className="label-caps">
              Questions you can ask of this data
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-oxford-50 px-2 py-0.5 font-figure text-2xs text-oxford-700">
              <Sparkles className="h-3 w-3" aria-hidden />Each opens a live view, no prewritten answer
            </span>
          </div>
          <p className="sr-only">
            Each of these opens a real view. None of them carries a prewritten answer —
            the figure is produced from the published observations when you open it.
          </p>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {questions.map((question, index) => (
              <Reveal as="li" key={question.id} delay={index * 70}>
                <button
                  type="button"
                  onClick={() =>
                    open({
                      topic: question.topic,
                      indicatorId: question.id,
                      areaTypeKey: question.areaTypeKey,
                      period: null,
                      sex: null,
                    })
                  }
                  className="group flex h-full w-full flex-col rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition
                             hover:-translate-y-0.5 hover:border-brass-400 hover:shadow-md
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-600"
                >
                  <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-figure text-[0.65rem] text-slate-600">
                    {question.topicLabel}
                  </span>
                  <span className="flex-1 text-sm font-medium leading-snug text-oxford-800 group-hover:underline">
                    {question.text}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-2xs font-semibold text-brass-700">
                    Open <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </button>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------------------------------------------- recently updated */}
      <section aria-labelledby="recent-heading" className="mt-10">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 id="recent-heading" className="label-caps flex items-center gap-1.5">
            <Clock className="h-3 w-3" aria-hidden />
            Most recently published by the source
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-figure text-2xs text-amber-900">
            <Info className="h-3 w-3" aria-hidden />Upload date ≠ the period the data cover
          </span>
        </div>
        <p className="sr-only">
          These are the publisher’s own upload dates, which are not the same thing as the
          period an observation covers, nor as the date this dataset was prepared
          ({formatDate(manifest.generatedAt)}).
        </p>
        {/* A timeline: newest on the left, each stop a published indicator. */}
        <ol className="relative grid gap-3 sm:grid-cols-5">
          <span aria-hidden className="absolute left-0 right-0 top-[7px] hidden h-0.5 bg-slate-200 sm:block" />
          {recent.map((indicator, index) => {
            const geographyKey = Object.keys(indicator.geographies)[0];
            const geography = indicator.geographies[geographyKey];
            return (
              <Reveal as="li" key={indicator.id} delay={index * 90} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    open({
                      topic: indicator.topic,
                      indicatorId: indicator.id,
                      areaTypeKey: geographyKey,
                      period: null,
                      sex: null,
                    })
                  }
                  className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-600"
                >
                  <span aria-hidden className={`relative z-10 block h-4 w-4 rounded-full border-2 border-white shadow ${index === 0 ? 'pulse-ring bg-brass-500' : 'bg-oxford-600'}`} />
                  <span className="mt-2 block font-figure text-2xs tabular-nums text-slate-500">
                    {indicator.lastUploadedAt?.slice(0, 10)}
                  </span>
                  <span className="block text-sm font-medium leading-snug text-oxford-800 group-hover:underline">
                    {indicator.shortName}
                  </span>
                  <span className="mt-0.5 block font-figure text-2xs text-slate-500">
                    {indicator.topicLabel}
                    {geography?.latestPeriod ? ` · latest ${geography.latestPeriod}` : ''}
                  </span>
                </button>
              </Reveal>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function EntryCard({
  icon: Icon, title, body, action, index,
}: {
  icon: typeof MapPin;
  title: string;
  body: string;
  action: React.ReactNode;
  index: number;
}) {
  return (
    <Reveal as="li" delay={index * 90} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-oxford-700 to-oxford-900 text-white shadow">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span>
          <h4 className="text-base font-semibold leading-tight text-oxford-800">{title}</h4>
          <p className="mt-0.5 text-xs leading-snug text-slate-600">{body}</p>
        </span>
      </div>
      <div className="mt-auto">{action}</div>
    </Reveal>
  );
}
