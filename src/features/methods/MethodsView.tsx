import { useState } from 'react';
import {
  ScrollText, BookMarked, Map as MapIcon, Sigma, Database, Users as UsersIcon,
  Eye, Unlink, ClipboardList, Scale, ListOrdered, CircleDashed, Check, X, Lock,
  Ruler, MoveHorizontal, Palette, CalendarRange, Ban, Layers, Building2, Hospital,
  MapPinned, Search, Link2Off, FileJson, HardDrive, ShieldCheck, Fingerprint,
} from 'lucide-react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@/components/ui/misc';
import { formatDate, cn } from '@/lib/utils';
import { TeamSection } from '@/features/about/TeamSection';
import { Reveal } from '@/components/motion/motion';
import { RuleGrid } from '@/components/infographics/infographics';
import { NON_DATA_STYLES, SEQUENTIAL_OXFORD } from '@/charts/palette';

/**
 * Methods, definitions and limits.
 *
 * Everything here is read from the prepared data or states a rule the code
 * enforces, so the documentation cannot drift from the dataset it describes.
 * Rules are laid out as cards and diagrams; every sentence is still on the page.
 */
export function MethodsView({ catalogue }: { catalogue: Catalogue }) {
  const { manifest, indicators } = catalogue;
  const [selectedId, setSelectedId] = useState<number>(indicators[0]?.id ?? 0);
  const indicator = indicators.find((item) => item.id === selectedId) ?? indicators[0];

  return (
    <div className="shell py-6">
      <Reveal as="header" className="max-w-3xl">
        <p className="label-caps">Methods</p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.015em] text-oxford-900">
          How to read this atlas, and what it cannot tell you
        </h2>
      </Reveal>

      {/* The six rules a reader most needs, before any detail. */}
      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Eye, text: 'Descriptive only' },
          { icon: CircleDashed, text: 'Blank ≠ zero' },
          { icon: ClipboardList, text: 'Recorded ≠ true prevalence' },
          { icon: Scale, text: 'Size ≠ evidence' },
          { icon: ListOrdered, text: 'Rank ≠ performance' },
          { icon: Unlink, text: 'Areas ≠ people' },
        ].map(({ icon: Icon, text }, index) => (
          <Reveal as="li" key={text} delay={index * 60}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center shadow-sm"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-oxford-800 text-white">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-xs font-semibold leading-tight text-oxford-900">{text}</span>
          </Reveal>
        ))}
      </ul>

      <Tabs defaultValue="interpretation" className="mt-6">
        <TabsList className="mb-5 w-full overflow-x-auto">
          {([
            ['interpretation', ScrollText, 'Interpretation rules'],
            ['indicators', BookMarked, 'Indicator definitions'],
            ['geography', MapIcon, 'Geography'],
            ['statistics', Sigma, 'Statistics and cartography'],
            ['provenance', Database, 'Sources and licensing'],
            ['team', UsersIcon, 'Team'],
          ] as const).map(([value, Icon, label]) => (
            <TabsTrigger key={value} value={value} className="inline-flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" aria-hidden />{label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ------------------------------------------------- interpretation */}
        <TabsContent value="interpretation" className="space-y-8">
          <section>
            <SectionTitle icon={Eye}>What kind of evidence this is</SectionTitle>
            <p className="sr-only">
              Everything in this atlas is descriptive: it reports published figures by place
              and period, with the uncertainty the publisher supplied. Of four kinds of claim,
              this product makes only the first.
            </p>
            <Ladder />
          </section>

          <section>
            <SectionTitle icon={CircleDashed}>Four distinct reasons an area may have no colour</SectionTitle>
            <p className="sr-only">
              A blank area on a choropleth is the most commonly misread element of a map like
              this. The atlas keeps four states apart and styles each differently, and a value
              of zero is none of them — zero is a real value and is coloured on the scale.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { swatch: 'missing' as const, title: 'No value published', body: 'The geography is in the dataset, but no figure was supplied for this area and period.' },
                { swatch: 'suppressed' as const, title: 'Suppressed', body: 'The publisher withheld the value, usually to protect small numbers. A suppressed area is not a low area.' },
                { swatch: 'outsideCoverage' as const, title: 'Not covered by this dataset', body: 'Scotland, Wales and Northern Ireland are on the map for navigation, but the source is England-only. Coverage gaps, not low values; no UK benchmark is computed.' },
                { swatch: 'notApplicable' as const, title: 'Not applicable', body: 'The geography type does not exist in that nation at all.' },
                { swatch: 'zero' as const, title: 'Zero is a value', body: 'A published zero is a measurement, coloured on the scale like any other value.' },
              ].map((state, index) => (
                <Reveal as="li" key={state.title} delay={index * 70} className="rounded-xl border border-slate-200 bg-white p-3">
                  <StateSwatch kind={state.swatch} />
                  <p className="mt-2 text-sm font-semibold text-oxford-900">{state.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{state.body}</p>
                </Reveal>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle icon={ShieldCheck}>Reading rules</SectionTitle>
            <RuleGrid
              columns={3}
              rules={[
                {
                  icon: ClipboardList, tone: 'amber',
                  title: 'Recorded prevalence is not disease prevalence',
                  body: 'Several indicators are QOF register prevalences. A higher recorded prevalence can mean better case-finding and coding rather than more disease, and a lower one can mean under-diagnosis. For those, the atlas refuses to repeat a “better” or “worse” reading even when the publisher supplies the flag, and says why.',
                },
                {
                  icon: Scale,
                  title: 'Magnitude and evidence are separate',
                  body: 'The size of a difference and the strength of evidence for it are different quantities. A large difference with a wide interval and a small difference with a narrow interval are not the same finding; the atlas reports both rather than one verdict.',
                },
                {
                  icon: ListOrdered,
                  title: 'Rankings are not league tables',
                  body: 'Ordering areas by value is useful for finding the ends of a distribution. It is not a performance ranking: adjacent areas are usually statistically indistinguishable, and these measures reflect need, access, case-finding and coding as well as any notion of performance.',
                },
              ]}
            />
          </section>
        </TabsContent>

        {/* ----------------------------------------------------- indicators */}
        <TabsContent value="indicators">
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <nav aria-label="Indicators" className="scrollbar-thin max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1">
              <ul className="space-y-0.5">
                {indicators.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      aria-current={item.id === selectedId ? 'true' : undefined}
                      className={cn(
                        'w-full rounded-lg px-2.5 py-1.5 text-left text-xs leading-snug transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700',
                        item.id === selectedId
                          ? 'bg-oxford-800 font-medium text-white'
                          : 'text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      {item.shortName}
                      <span className={cn('mt-0.5 block font-figure text-2xs', item.id === selectedId ? 'text-oxford-200' : 'text-slate-500')}>
                        {item.domainLabel} · ID {item.id}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {indicator ? (
              <article key={indicator.id} className="min-w-0 space-y-4">
                <Reveal as="header">
                  <h3 className="text-lg font-semibold leading-snug text-oxford-900">
                    {indicator.name}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone="brass">Fingertips ID {indicator.id}</Badge>
                    <Badge tone="neutral">{indicator.valueType}</Badge>
                    <Badge tone="neutral">{indicator.unit}</Badge>
                    <Badge tone="neutral">{indicator.yearType} year</Badge>
                    {indicator.direction === 'not-interpretable' ? (
                      <Badge tone="warn">not interpretable as better/worse</Badge>
                    ) : null}
                  </div>
                </Reveal>

                <section>
                  <h4 className="label-caps mb-2">Where this indicator is published</h4>
                  <ul className="grid gap-2 sm:grid-cols-3">
                    {Object.values(indicator.geographies).map((geography) => {
                      const share = geography.areaCount > 0 ? geography.areasWithValue / geography.areaCount : 0;
                      return (
                        <li key={geography.areaTypeKey} className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-sm font-semibold text-oxford-900">{geography.label}</p>
                          <p className="font-figure text-2xs text-slate-500">{geography.boundaryVintage} boundaries</p>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-xl font-semibold tabular-nums text-oxford-900">{geography.areasWithValue}</span>
                            <span className="font-figure text-2xs text-slate-500">of {geography.areaCount} with a value</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="grow-x h-full rounded-full bg-oxford-600" style={{ width: `${share * 100}%` }} />
                          </div>
                          <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 font-figure text-2xs">
                            <dt className="text-slate-500">Latest</dt><dd className="text-slate-700">{geography.latestPeriod}</dd>
                            <dt className="text-slate-500">Periods</dt>
                            <dd className="text-slate-700">
                              {geography.periodSeries.map((series) => `${series.periodCount} ${series.label.toLowerCase()}`).join(', ')}
                            </dd>
                            <dt className="text-slate-500">Intervals</dt>
                            <dd className="text-slate-700">{geography.hasConfidenceIntervals ? '95% and 99.8%' : 'none published'}</dd>
                            <dt className="text-slate-500">Suppressed</dt><dd className="tabular-nums text-slate-700">{geography.suppressedCount}</dd>
                          </dl>
                        </li>
                      );
                    })}
                  </ul>
                  {Object.values(indicator.geographies).some((g) => g.mixesPooledAndSingleYear) ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-2xs text-amber-900">
                      <Layers className="h-3.5 w-3.5" aria-hidden />
                      Pooled and single-year periods share this ID. They are held as separate series and never plotted on one line.
                    </p>
                  ) : null}
                </section>

                <dl className="grid gap-2 md:grid-cols-2">
                  <Field label="Definition" value={indicator.definition} wide />
                  <Field label="Rationale" value={indicator.rationale} wide />
                  <Field label="Numerator" value={indicator.numeratorDefinition} />
                  <Field label="Numerator source" value={indicator.numeratorSource} />
                  <Field label="Denominator" value={indicator.denominatorDefinition} />
                  <Field label="Denominator source" value={indicator.denominatorSource} />
                  <Field label="Method" value={indicator.methodology} wide />
                  <Field label="Standard population" value={indicator.standardPopulation} />
                  <Field label="Confidence interval method" value={indicator.confidenceIntervalMethod} />
                  <Field label="Disclosure control" value={indicator.disclosureControl} wide />
                  <Field label="Caveats and comparability" value={indicator.caveats} wide />
                  <Field label="Data quality note" value={indicator.dataQualityNote} wide />
                  <Field label="Copyright" value={indicator.copyright} />
                </dl>

                {indicator.sourceLink ? (
                  <p className="font-figure text-2xs">
                    <a
                      className="text-brass-700 underline underline-offset-2"
                      href={indicator.sourceLink}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Publisher’s source page for this indicator
                    </a>
                  </p>
                ) : null}
              </article>
            ) : null}
          </div>
        </TabsContent>

        {/* ------------------------------------------------------- geography */}
        <TabsContent value="geography" className="space-y-8">
          <section>
            <SectionTitle icon={Link2Off}>Two separate geographies, with no hierarchy between them</SectionTitle>
            <GeographyTrees />
            <p className="sr-only">
              The atlas offers an administrative geography and an NHS geography. They are not
              levels of one tree. An integrated care board is not inside a local authority and
              a local authority is not inside an ICB: they are overlapping partitions of
              England whose only shared ancestor is the nation.
            </p>
          </section>
          <RuleGrid
            columns={3}
            rules={[
              {
                icon: Building2,
                title: 'England’s upper tier is not uniform',
                body: 'Counties and unitary authorities are genuinely mixed: county councils, metropolitan districts, London boroughs and unitary authorities sit at this tier as siblings. The atlas shows that as it is, with area counts from the live source.',
              },
              {
                icon: Search,
                title: 'A city is not an administrative area',
                body: 'Searching for a settlement resolves to the administrative area that contains it, and the interface says so — “this is not a city-only estimate”. Settlement and authority boundaries are never treated as equivalent.',
              },
              {
                icon: Fingerprint,
                title: 'Boundary vintages are matched to the data, not assumed',
                body: 'Layers were chosen by comparing their code sets with the publisher’s area register. Two ICB and two NHS region releases have the same counts but reissued codes, so matching on count alone would silently break the join. The vintage whose codes match exactly is used and recorded.',
              },
            ]}
          />
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse font-figure text-2xs">
              <caption className="sr-only">Geography levels and their boundary sources</caption>
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50 text-left">
                  <th scope="col" className="px-2 py-2 font-semibold text-slate-700">Level</th>
                  <th scope="col" className="px-2 py-2 font-semibold text-slate-700">Mode</th>
                  <th scope="col" className="px-2 py-2 font-semibold text-slate-700">Boundary vintage</th>
                  <th scope="col" className="px-2 py-2 font-semibold text-slate-700">Boundary scope</th>
                  <th scope="col" className="px-2 py-2 font-semibold text-slate-700">Data scope</th>
                  <th scope="col" className="px-2 py-2 font-semibold text-slate-700">Source layer</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(manifest.areaTypes).map((areaType) => (
                  <tr key={areaType.key} className="border-b border-slate-100">
                    <td className="px-2 py-1.5 text-oxford-900">{areaType.label}</td>
                    <td className="px-2 py-1.5 text-slate-600">
                      {areaType.mode === 'nhs' ? 'NHS' : 'Administrative'}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600">{areaType.boundaryVintage}</td>
                    <td className="px-2 py-1.5 text-slate-600">{areaType.boundaryScope}</td>
                    <td className="px-2 py-1.5 text-slate-600">{areaType.dataScope}</td>
                    <td className="px-2 py-1.5 font-mono text-[9px] text-slate-500">
                      {areaType.boundarySource}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------ statistics */}
        <TabsContent value="statistics" className="space-y-7">
          <RuleSection icon={Ruler} title="Rates, counts and standardisation" rules={[
            { icon: Ruler, title: 'Rates, not counts, for burden', body: 'Burden is compared using the rate the publisher supplies. Counts are shown separately in the detail panel and the table, and are never mapped as burden.' },
            { icon: Ban, title: 'No home-made national figure', body: 'Age-standardised rates are never averaged to produce a national figure. The England benchmark is the publisher’s own England row, not a mean of local values.' },
            { icon: Users2Icon, title: 'Crude rates say so', body: 'Where a measure is a crude rate, the atlas says so, and the evidence statement notes that differences in age structure between areas are not adjusted for.' },
          ]} />
          <RuleSection icon={MoveHorizontal} title="Uncertainty" rules={[
            { icon: MoveHorizontal, title: 'Intervals as published', body: 'Confidence intervals are reproduced exactly as published, at both 95% and 99.8% where supplied. No interval is ever derived from a rate.' },
            { icon: Sigma, title: 'The publisher’s flag, at its own level', body: 'Significance against England uses the publisher’s own flag; the atlas computes no test of its own. The interval drawn beside the flag is the one the flag follows — 99.8% for hypertension, depression and asthma prevalence, 95% elsewhere — read from the data.' },
            { icon: Scale, title: 'Overlap is not a test', body: <>Overlapping intervals are shown and described, but overlap is <strong>not</strong> treated as a significance test, and non-overlap is not treated as proof of a difference. Both appear as descriptions of the intervals.</> },
          ]} />
          <RuleSection icon={Palette} title="Map classification" rules={[
            { icon: ListOrdered, title: 'Five quantile classes by default', body: 'Computed only from areas that carry a value. Breakpoints, unit and method are printed on the legend and in every export. Quantiles use linear interpolation between order statistics, so breaks can be reproduced from the published values alone.' },
            { icon: Lock, title: 'Scales change only when you say', body: 'When comparing periods the scale can be locked: breaks are computed once across the whole series and the figure says the scale is fixed. Colours never change meaning silently.' },
            { icon: Palette, title: 'Colour-safe, outline for selection', body: 'Single-hue sequential or brass-to-Oxford-blue diverging palettes, with no red/green opposition. Non-data areas sit outside the value ramp. Selection is shown by outline only and never changes what a fill means.' },
          ]} />
          <RuleSection icon={CalendarRange} title="Time" rules={[
            { icon: Layers, title: 'Pooled periods stay pooled', body: 'Rolling multi-year pooled periods are held as a separate series from single-year periods and are never plotted as independent annual observations. Several indicators publish both under one ID. Change is measured against the latest period sharing no years with the current one.' },
            { icon: CalendarRange, title: 'Year types kept apart', body: 'Financial and calendar years are kept distinct and labelled.' },
            { icon: Sigma, title: 'Two points are not a trend', body: 'A change between two periods is described as a difference between two points, never as an established trend. The publisher’s own trend assessment, which Fingertips bases on the most recent points of the series, is quoted as theirs.' },
            { icon: CircleDashed, title: 'Gaps are gaps', body: 'Gaps in a time series are drawn as gaps. Nothing is interpolated across a period with no published value.' },
          ]} />
          <RuleSection icon={Ban} title="Comparisons that are blocked" rules={[
            { icon: Ban, title: 'Like with like, or not at all', body: 'A comparison requires the same geography, boundary vintage, period, period pooling and population subgroup. When any differ the comparison is refused and the reason stated, rather than a number being produced that looks valid.' },
            { icon: Unlink, title: 'Ecological inference', body: 'The scatter view plots two area-level measures with no fitted line and no correlation statistic, because neither would be interpretable as an exposure–outcome effect. An association between areas says nothing about individuals.' },
          ]} />
        </TabsContent>

        {/* ------------------------------------------------------ provenance */}
        <TabsContent value="provenance" className="space-y-7">
          <section>
            <SectionTitle icon={Database}>Sources</SectionTitle>
            <p className="mb-3 text-sm text-slate-700">
              {manifest.sourceProfiles.length} profiles from {manifest.licences.observations.publisher} via
              Fingertips; boundaries from the {manifest.licences.boundaries.publisher}. Prepared{' '}
              {formatDate(manifest.generatedAt)}.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {manifest.sourceProfiles.map((source, index) => (
                <Reveal as="li" key={source.id} delay={index * 60} className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="font-figure text-2xs text-brass-700">Profile {source.id}</span>
                  <p className="mt-0.5 text-sm font-semibold leading-snug text-oxford-900">{source.name}</p>
                  <p className="font-figure text-2xs text-slate-500">“{source.key}”</p>
                </Reveal>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Measures appearing in several profiles carry the same figures; the profile recorded is the one this pipeline used.
            </p>
          </section>
          <RuleGrid
            rules={[
              {
                icon: ScrollText, title: 'Licensing and attribution',
                body: (
                  <>
                    {manifest.licences.observations.attribution}{' '}
                    {manifest.licences.boundaries.attribution} Interactive maps use amCharts 5 under its
                    free licence, whose attribution link stays visible on the map; no licence key is
                    inserted. Exported figures come from this application’s own SVG renderer.
                  </>
                ),
              },
              {
                icon: ShieldCheck, title: 'Independence and endorsement',
                body: 'An independent research tool, built by the team named under Team. Affiliations identify them; no institution has reviewed, endorsed, funded or approved it. No endorsement from the NHS, OHID or ONS. Figures belong to their publishers; any error in the interpretation framework is the application’s.',
              },
              {
                icon: HardDrive, title: 'Local storage',
                body: 'Preferences and saved figure settings stay in this browser only. They are not synchronised or sent anywhere. Share the URL to give someone the same view.',
              },
              {
                icon: FileJson, title: 'Reproducibility',
                body: 'Every analytical choice is in the URL, and every figure downloads with a JSON specification: indicator, geography, period, benchmark, class breaks, source and retrieval date. The repository’s scripts regenerate the dataset from source.',
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="team">
          <TeamSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Users2Icon = UsersIcon;

function SectionTitle({ icon: Icon, children }: { icon: typeof Eye; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-oxford-900">
      <Icon className="h-4 w-4 text-brass-600" aria-hidden />{children}
    </h3>
  );
}

function RuleSection({ icon, title, rules }: {
  icon: typeof Eye; title: string; rules: Parameters<typeof RuleGrid>[0]['rules'];
}) {
  return (
    <section>
      <SectionTitle icon={icon}>{title}</SectionTitle>
      <RuleGrid rules={rules} columns={rules.length >= 3 ? 3 : 2} />
    </section>
  );
}

function Field({ label, value, wide = false }: { label: string; value: string | null; wide?: boolean }) {
  if (!value) return null;
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-3', wide && 'md:col-span-2')}>
      <dt className="label-caps">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-700">
        {value}
      </dd>
    </div>
  );
}

/** Swatches drawn with the map's own non-data styles, so the key matches the map. */
function StateSwatch({ kind }: { kind: 'missing' | 'suppressed' | 'outsideCoverage' | 'notApplicable' | 'zero' }) {
  if (kind === 'zero') {
    return (
      <span className="flex h-10 items-center justify-center rounded-lg text-lg font-bold text-oxford-900" style={{ background: SEQUENTIAL_OXFORD[0] }}>
        0
      </span>
    );
  }
  const style = NON_DATA_STYLES[kind];
  const pattern =
    style.pattern === 'hatch'
      ? `repeating-linear-gradient(90deg, ${style.stroke} 0 1px, ${style.fill} 1px 4px)`
      : style.pattern === 'diagonal'
        ? `repeating-linear-gradient(45deg, ${style.stroke} 0 1px, ${style.fill} 1px 5px)`
        : style.fill;
  return <span aria-hidden className="block h-10 rounded-lg border" style={{ background: pattern, borderColor: style.stroke }} />;
}

/** The claim ladder as a staircase: only the first step is supported here. */
function Ladder() {
  const rungs: { label: string; supported: boolean; body: string }[] = [
    {
      label: 'Descriptive finding',
      supported: true,
      body: 'This area’s published figure was X in period P, with this interval, compared with England.',
    },
    {
      label: 'Association',
      supported: false,
      body: 'Two area-level measures vary together. Shown only in the scatter view, with an ecological-inference warning and no fitted line.',
    },
    {
      label: 'Hypothesis',
      supported: false,
      body: 'A possible explanation worth investigating. Appears only as an open question or a dashed arrow in a conceptual diagram.',
    },
    {
      label: 'Causal evidence',
      supported: false,
      body: 'X causes Y, or changing X would change Y. Nothing in this atlas can support this; it needs evidence of effect from study designs this product does not contain.',
    },
  ];
  return (
    <ol className="grid items-end gap-2 sm:grid-cols-4">
      {rungs.map((rung, index) => (
        <Reveal as="li" key={rung.label} delay={index * 120}
          className={cn(
            'flex flex-col rounded-xl border p-3',
            rung.supported
              ? 'border-brass-400 bg-gradient-to-b from-brass-50 to-white shadow-md'
              : 'border-dashed border-slate-300 bg-slate-50/60',
          )}
          style={{ minHeight: `${7 + index * 2.2}rem` }}
        >
          <span className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full',
            rung.supported ? 'bg-brass-600 text-white' : 'bg-slate-200 text-slate-500',
          )}>
            {rung.supported ? <Check className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
          </span>
          <span className="mt-2 text-sm font-semibold text-oxford-900">{rung.label}</span>
          <Badge tone={rung.supported ? 'brass' : 'warn'} className="mt-1 w-fit">
            {rung.supported ? 'supported here' : 'not supported here'}
          </Badge>
          <span className="mt-1.5 text-xs leading-relaxed text-slate-600">{rung.body}</span>
        </Reveal>
      ))}
    </ol>
  );
}

/** Administrative and NHS geographies as two trees that share only the nation. */
function GeographyTrees() {
  const node = 'rounded-lg border px-3 py-1.5 text-center text-xs font-semibold';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mx-auto flex w-fit flex-col items-center">
        <span className={cn(node, 'border-oxford-800 bg-oxford-800 text-white')}>
          <MapPinned className="mr-1 inline h-3.5 w-3.5" aria-hidden />England
        </span>
      </div>
      {/* Connector to the centre of each column, whatever the width. */}
      <div aria-hidden className="relative h-8">
        <span className="absolute left-1/2 top-0 h-4 w-px bg-oxford-300" />
        <span className="absolute left-1/4 right-1/4 top-4 h-px bg-oxford-300" />
        <span className="absolute left-1/4 top-4 h-4 w-px bg-oxford-300" />
        <span className="absolute right-1/4 top-4 h-4 w-px bg-oxford-300" />
      </div>
      <div className="grid grid-cols-2">
        <div className="flex flex-col items-center gap-2">
          <span className="label-caps text-oxford-700">Administrative</span>
          <span className={cn(node, 'border-oxford-300 bg-oxford-50 text-oxford-900')}>
            <Building2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />Counties and unitary authorities
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="label-caps text-oxford-700">NHS</span>
          <span className={cn(node, 'border-oxford-300 bg-oxford-50 text-oxford-900')}>NHS England regions</span>
          <span aria-hidden className="h-3 w-px bg-oxford-300" />
          <span className={cn(node, 'border-oxford-300 bg-oxford-50 text-oxford-900')}>
            <Hospital className="mr-1 inline h-3.5 w-3.5" aria-hidden />Integrated care boards
          </span>
        </div>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-brass-800">
        <Link2Off className="h-4 w-4" aria-hidden />
        No link between the two trees: an ICB is not inside a council, and a council is not inside an ICB
      </p>
    </div>
  );
}
