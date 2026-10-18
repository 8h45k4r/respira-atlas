import { useMemo } from 'react';
import { MapPin, Layers, Users, BookOpen, ArrowRight, Clock } from 'lucide-react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import { Badge } from '@/components/ui/misc';
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

  return (
    <div className="mx-auto w-full max-w-[72rem] px-4 py-8">
      <section className="max-w-3xl">
        <h2 className="text-[1.6rem] font-semibold leading-[1.15] tracking-[-0.02em] text-oxford-800">
          What would you like to understand about public health?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {manifest.indicators.length} verified indicators across{' '}
          {Object.keys(manifest.topics).length} topics, drawn from the{' '}
          {manifest.licences.observations.publisher} and published with the uncertainty,
          definitions and coverage limits the source supplies.
        </p>
        <p className="mt-2 rounded-sm border-l-2 border-brass-500 bg-brass-50/60 py-2 pl-3 pr-3 text-xs leading-relaxed text-brass-900">
          <strong>Coverage.</strong> {manifest.coverage.statement}
        </p>
      </section>

      {/* ------------------------------------------------------ entry points */}
      <section aria-labelledby="entry-heading" className="mt-8">
        <h3 id="entry-heading" className="label-caps mb-3">
          Four ways in
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          <EntryCard
            icon={MapPin}
            title="Explore a place"
            body="Start from a local authority, an integrated care board or a town, and see every indicator published for it."
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
            icon={Layers}
            title="Explore a health topic"
            body="Pick a topic and compare places across the measures published for it."
            action={
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {topics.map((topic) => (
                  <li key={topic.key}>
                    <button
                      type="button"
                      onClick={() => open({ topic: topic.key, indicatorId: null })}
                      className="rounded-sm border border-slate-300 px-2 py-1 text-2xs
                                 font-medium text-oxford-800 transition-colors
                                 hover:border-oxford-400 hover:bg-oxford-50
                                 focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-brass-600"
                    >
                      {topic.short}
                      <span className="ml-1 text-slate-500">{topic.indicatorCount}</span>
                    </button>
                  </li>
                ))}
              </ul>
            }
          />
          <EntryCard
            icon={Users}
            title="Compare populations"
            body="Where the publisher breaks a measure down, compare the groups it supplies — and see plainly where it does not."
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
            icon={BookOpen}
            title="Follow an evidence story"
            body="Work through a question end to end: the pattern, the comparison, the uncertainty, and what cannot be concluded from it."
            action={
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onChange({ mode: 'explain' })}
              >
                Open the evidence workspace
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            }
          />
        </ul>
      </section>

      {/* -------------------------------------------------- starting questions */}
      {questions.length > 0 ? (
        <section aria-labelledby="questions-heading" className="mt-8">
          <h3 id="questions-heading" className="label-caps mb-1">
            Questions you can ask of this data
          </h3>
          <p className="mb-3 max-w-2xl text-xs leading-relaxed text-slate-600">
            Each of these opens a real view. None of them carries a prewritten answer —
            the figure is produced from the published observations when you open it.
          </p>
          <ul className="divide-y divide-slate-200 border-y border-slate-200">
            {questions.map((question) => (
              <li key={question.id}>
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
                  className="group flex w-full items-start gap-3 py-2.5 text-left
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-brass-600"
                >
                  <span className="mt-0.5 shrink-0">
                    <Badge tone="neutral">{question.topicLabel}</Badge>
                  </span>
                  <span className="flex-1 text-sm leading-snug text-oxford-800 group-hover:underline">
                    {question.text}
                  </span>
                  <ArrowRight
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-brass-600"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------------------------------------------- recently updated */}
      <section aria-labelledby="recent-heading" className="mt-8">
        <h3 id="recent-heading" className="label-caps mb-1 flex items-center gap-1.5">
          <Clock className="h-3 w-3" aria-hidden />
          Most recently published by the source
        </h3>
        <p className="mb-3 max-w-2xl text-xs leading-relaxed text-slate-600">
          These are the publisher’s own upload dates, which are not the same thing as the
          period an observation covers, nor as the date this dataset was prepared
          ({formatDate(manifest.generatedAt)}).
        </p>
        <ul className="divide-y divide-slate-200 border-y border-slate-200">
          {recent.map((indicator) => {
            const geographyKey = Object.keys(indicator.geographies)[0];
            const geography = indicator.geographies[geographyKey];
            return (
              <li key={indicator.id}>
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
                  className="group flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5
                             text-left focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-brass-600"
                >
                  <span className="font-figure text-2xs tabular-nums text-slate-500">
                    {indicator.lastUploadedAt?.slice(0, 10)}
                  </span>
                  <span className="flex-1 text-sm leading-snug text-oxford-800 group-hover:underline">
                    {indicator.shortName}
                  </span>
                  <span className="font-figure text-2xs text-slate-500">
                    {indicator.topicLabel}
                    {geography?.latestPeriod ? ` · latest ${geography.latestPeriod}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function EntryCard({
  icon: Icon, title, body, action,
}: {
  icon: typeof MapPin;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <li className="panel flex flex-col p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-oxford-800">
        <Icon className="h-4 w-4 text-brass-600" aria-hidden />
        {title}
      </h4>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{body}</p>
      <div className="mt-auto">{action}</div>
    </li>
  );
}
