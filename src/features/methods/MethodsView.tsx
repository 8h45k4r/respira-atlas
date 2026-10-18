import { useState } from 'react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@/components/ui/misc';
import { formatDate } from '@/lib/utils';
import { TeamSection } from '@/features/about/TeamSection';

/**
 * Methods, definitions and limits.
 *
 * Everything here is read from the prepared data rather than written by hand, so
 * the documentation cannot drift away from the dataset it describes.
 */
export function MethodsView({ catalogue }: { catalogue: Catalogue }) {
  const { manifest, indicators } = catalogue;
  const [selectedId, setSelectedId] = useState<number>(indicators[0]?.id ?? 0);
  const indicator = indicators.find((item) => item.id === selectedId) ?? indicators[0];

  return (
    <div className="mx-auto w-full max-w-[82rem] px-4 py-5">
      <div className="mb-4 max-w-3xl">
        <p className="label-caps">Methods</p>
        <h2 className="mt-1 text-lg font-semibold leading-tight text-oxford-900">
          How to read this atlas, and what it cannot tell you
        </h2>
      </div>

      <Tabs defaultValue="interpretation">
        <TabsList className="mb-4 w-full overflow-x-auto">
          <TabsTrigger value="interpretation">Interpretation rules</TabsTrigger>
          <TabsTrigger value="indicators">Indicator definitions</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="statistics">Statistics and cartography</TabsTrigger>
          <TabsTrigger value="provenance">Sources and licensing</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="interpretation" className="space-y-5">
          <Prose>
            <h3>What kind of evidence this is</h3>
            <p>
              Everything in this atlas is <strong>descriptive</strong>: it reports published
              figures by place and period, with the uncertainty the publisher supplied. The
              distinction between four different kinds of claim matters, and this product
              only makes the first.
            </p>
            <Ladder />
            <h3>Four distinct reasons an area may have no colour</h3>
            <p>
              A blank area on a choropleth is the most commonly misread element of a map
              like this. The atlas keeps four states apart and styles each differently,
              and a value of <strong>zero</strong> is none of them — zero is a real value
              and is coloured on the scale.
            </p>
            <ul>
              <li>
                <strong>No value published.</strong> The geography exists and is in the
                dataset, but no figure was supplied for this area and period.
              </li>
              <li>
                <strong>Suppressed.</strong> The publisher withheld the value, usually to
                protect small numbers. A suppressed area is not a low area.
              </li>
              <li>
                <strong>Not covered by this dataset.</strong> Scotland, Wales and Northern
                Ireland appear on the administrative map for navigation, but the source is
                England-only. These are coverage gaps, not low values, and no UK benchmark
                is computed anywhere in this product.
              </li>
              <li>
                <strong>Not applicable.</strong> The geography type does not exist in that
                nation at all.
              </li>
            </ul>
            <h3>Recorded prevalence is not disease prevalence</h3>
            <p>
              Several indicators here are QOF register prevalences. A higher recorded
              prevalence can mean better case-finding and coding rather than more disease,
              and a lower one can mean under-diagnosis. For those indicators the atlas
              refuses to repeat a “better” or “worse” reading even when the publisher
              supplies the flag, and says why.
            </p>
            <h3>Magnitude and evidence are separate</h3>
            <p>
              The size of a difference and the strength of evidence for it are different
              quantities. A large difference with a wide interval and a small difference
              with a narrow interval are not the same finding, and the atlas reports both
              rather than collapsing them into a single verdict.
            </p>
            <h3>Rankings are not league tables</h3>
            <p>
              Ordering areas by value is useful for finding the ends of a distribution. It
              is not a performance ranking: adjacent areas are usually statistically
              indistinguishable, and these measures reflect need, access, case-finding and
              coding as well as any notion of performance.
            </p>
          </Prose>
        </TabsContent>

        <TabsContent value="indicators">
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <nav aria-label="Indicators">
              <ul className="space-y-0.5">
                {indicators.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      aria-current={item.id === selectedId ? 'true' : undefined}
                      className={`w-full border-l-2 px-2.5 py-1.5 text-left text-xs leading-snug transition-colors
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700 ${
                          item.id === selectedId
                            ? 'border-brass-700 bg-accent font-medium text-oxford-900'
                            : 'border-transparent text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      {item.shortName}
                      <span className="mt-0.5 block font-figure text-2xs text-slate-500">
                        {item.domainLabel} · ID {item.id}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {indicator ? (
              <article className="min-w-0 space-y-4">
                <header>
                  <h3 className="text-base font-semibold leading-snug text-oxford-900">
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
                </header>

                <dl className="space-y-3">
                  <Field label="Definition" value={indicator.definition} />
                  <Field label="Rationale" value={indicator.rationale} />
                  <Field label="Numerator" value={indicator.numeratorDefinition} />
                  <Field label="Numerator source" value={indicator.numeratorSource} />
                  <Field label="Denominator" value={indicator.denominatorDefinition} />
                  <Field label="Denominator source" value={indicator.denominatorSource} />
                  <Field label="Method" value={indicator.methodology} />
                  <Field label="Standard population" value={indicator.standardPopulation} />
                  <Field label="Confidence interval method" value={indicator.confidenceIntervalMethod} />
                  <Field label="Disclosure control" value={indicator.disclosureControl} />
                  <Field label="Caveats and comparability" value={indicator.caveats} />
                  <Field label="Data quality note" value={indicator.dataQualityNote} />
                  <Field label="Copyright" value={indicator.copyright} />
                </dl>

                <section>
                  <h4 className="label-caps mb-1.5">Where this indicator is published</h4>
                  <table className="w-full border-collapse font-figure text-2xs">
                    <thead>
                      <tr className="border-b border-slate-300 text-left">
                        <th scope="col" className="py-1 pr-2 font-semibold text-slate-600">Geography</th>
                        <th scope="col" className="py-1 pr-2 font-semibold text-slate-600">Boundaries</th>
                        <th scope="col" className="py-1 pr-2 font-semibold text-slate-600">Periods</th>
                        <th scope="col" className="py-1 pr-2 font-semibold text-slate-600">Latest</th>
                        <th scope="col" className="py-1 pr-2 font-semibold text-slate-600">Areas with a value</th>
                        <th scope="col" className="py-1 pr-2 font-semibold text-slate-600">Intervals</th>
                        <th scope="col" className="py-1 font-semibold text-slate-600">Suppressed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(indicator.geographies).map((geography) => (
                        <tr key={geography.areaTypeKey} className="border-b border-slate-100">
                          <td className="py-1 pr-2 text-oxford-900">{geography.label}</td>
                          <td className="py-1 pr-2 text-slate-600">{geography.boundaryVintage}</td>
                          <td className="py-1 pr-2 tabular-nums text-slate-600">
                            {geography.periodSeries
                              .map((series) => `${series.periodCount} ${series.label.toLowerCase()}`)
                              .join(', ')}
                          </td>
                          <td className="py-1 pr-2 text-slate-600">{geography.latestPeriod}</td>
                          <td className="py-1 pr-2 tabular-nums text-slate-600">
                            {geography.areasWithValue} of {geography.areaCount}
                          </td>
                          <td className="py-1 pr-2 text-slate-600">
                            {geography.hasConfidenceIntervals ? '95% and 99.8%' : 'none published'}
                          </td>
                          <td className="py-1 tabular-nums text-slate-600">
                            {geography.suppressedCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {Object.values(indicator.geographies).some((g) => g.mixesPooledAndSingleYear) ? (
                    <p className="mt-2 text-2xs leading-relaxed text-amber-800">
                      This indicator publishes both pooled multi-year and single-year
                      periods under one indicator ID. They are held as separate series
                      here and are never plotted on one line.
                    </p>
                  ) : null}
                </section>

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

        <TabsContent value="geography" className="space-y-5">
          <Prose>
            <h3>Two separate geographies, with no hierarchy between them</h3>
            <p>
              The atlas offers an administrative geography and an NHS geography. They are
              <strong> not</strong> levels of one tree. An integrated care board is not
              inside a local authority and a local authority is not inside an ICB: they
              are overlapping partitions of England whose only shared ancestor is the
              nation. The data model has no edge between them, and a comparison cannot mix
              them.
            </p>
            <h3>England’s upper tier is not uniform</h3>
            <p>
              The administrative level shown is counties and unitary authorities. In
              England these are genuinely mixed: county councils, metropolitan districts,
              London boroughs and unitary authorities all sit at this tier as siblings.
              The atlas represents that as it is rather than imposing a uniform grid, and
              the area counts come from the live source rather than from a remembered
              figure.
            </p>
            <h3>A city is not an administrative area</h3>
            <p>
              Searching for a settlement resolves to the administrative area that contains
              it, and the interface says so explicitly — “this is not a city-only
              estimate”. Settlement boundaries and authority boundaries are never treated
              as equivalent.
            </p>
            <h3>Boundary vintages are matched to the data, not assumed</h3>
            <p>
              Boundary layers were chosen by comparing their code sets against the
              publisher’s own area register. Two cases mattered: both the April 2023 and
              July 2022 ICB releases contain 42 ICBs, and both NHS region releases contain
              seven regions, but some codes were reissued between them. Matching on count
              alone would have produced a silently broken join, so the vintage whose codes
              match exactly is used and recorded.
            </p>
          </Prose>
          <div className="overflow-auto border border-slate-200">
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

        <TabsContent value="statistics" className="space-y-5">
          <Prose>
            <h3>Rates, counts and standardisation</h3>
            <ul>
              <li>
                Burden is compared using the rate the publisher supplies. Counts are shown
                separately in the detail panel and the table, and are never mapped as
                burden.
              </li>
              <li>
                Age-standardised rates are never averaged to produce a national figure.
                The England benchmark is the publisher’s own England row, not a mean of
                local values.
              </li>
              <li>
                Where a measure is a crude rate, the atlas says so, and the evidence
                statement notes that differences in age structure between areas are not
                adjusted for.
              </li>
            </ul>
            <h3>Uncertainty</h3>
            <ul>
              <li>
                Confidence intervals are reproduced exactly as published, at both 95% and
                99.8% where supplied. No interval is ever derived from a rate.
              </li>
              <li>
                Significance against England uses the publisher’s own flag. The atlas does
                not compute its own significance test.
              </li>
              <li>
                Overlapping intervals are shown and described, but overlap is{' '}
                <strong>not</strong> treated as a significance test, and non-overlap is
                not treated as proof of a difference. Both appear as descriptions of the
                intervals.
              </li>
            </ul>
            <h3>Map classification</h3>
            <ul>
              <li>
                The default is a five-class quantile classification, computed only from
                areas that carry a value. The breakpoints, unit and method are printed on
                the legend and in every export.
              </li>
              <li>
                The quantile uses linear interpolation between order statistics, so the
                breakpoints can be reproduced from the published values alone.
              </li>
              <li>
                When comparing periods, the scale can be locked: class breaks are then
                computed once across the whole series, and the figure says that the scale
                is fixed. Rescaling is always explicit — colours never change meaning
                silently.
              </li>
              <li>
                Selection is shown by outline only. Selecting an area never changes what
                the fill legend means.
              </li>
              <li>
                Palettes are single-hue sequential or brass-to-purple diverging, with no
                red/green opposition, and non-data areas are styled outside the value
                ramp entirely.
              </li>
            </ul>
            <h3>Time</h3>
            <ul>
              <li>
                Rolling multi-year pooled periods are held as a separate series from
                single-year periods and are never plotted as independent annual
                observations. Several indicators in this release publish both under one
                indicator ID.
              </li>
              <li>
                Financial and calendar years are kept distinct and labelled.
              </li>
              <li>
                A change between two periods is described as a difference between two
                points, never as an established trend. Where the publisher supplies its
                own trend assessment over the full series, that is quoted as theirs.
              </li>
              <li>
                Gaps in a time series are drawn as gaps. Nothing is interpolated across a
                period with no published value.
              </li>
            </ul>
            <h3>Comparisons that are blocked</h3>
            <p>
              A comparison requires the same geography, boundary vintage, period, period
              pooling and population subgroup. When any of these differ the comparison is
              refused and the reason is stated, rather than a number being produced that
              looks valid.
            </p>
            <h3>Ecological inference</h3>
            <p>
              The scatter view plots two area-level measures. It carries no fitted line and
              no correlation statistic, because neither would be interpretable as an
              exposure–outcome effect, and it states that an association between areas
              says nothing about individuals.
            </p>
          </Prose>
        </TabsContent>

        <TabsContent value="provenance" className="space-y-5">
          <Prose>
            <h3>Sources</h3>
            <p>
              Observations come from the {manifest.profile.name} profile
              (“{manifest.profile.key}”) published by{' '}
              {manifest.licences.observations.publisher} through Fingertips. Boundaries
              come from the {manifest.licences.boundaries.publisher}. The dataset bundled
              with this build was prepared on {formatDate(manifest.generatedAt)}.
            </p>
            <h3>Licensing and attribution</h3>
            <p>{manifest.licences.observations.attribution}</p>
            <p>{manifest.licences.boundaries.attribution}</p>
            <p>
              Interactive maps are rendered with amCharts 5 under its free licence. That
              licence requires the amCharts attribution link to remain visible on the
              chart; it is present and has not been removed, and no licence key has been
              inserted. Exported figures are produced by this application’s own SVG
              renderer and are not subject to that requirement.
            </p>
            <h3>Independence and endorsement</h3>
            <p>
              This is an independent working research tool, built and maintained by the
              team named under <strong>Team</strong>. Their institutional affiliations
              identify them and their background; they do not mean that any institution
              has reviewed, endorsed, funded or approved this atlas or the analyses
              produced with it.
            </p>
            <p>
              It carries no endorsement from the NHS, the Office for Health Improvement
              and Disparities, or the Office for National Statistics. Published figures
              and their definitions belong to their publishers; the interpretation
              framework here is the application’s own, and any error in it is the
              application’s, not the publisher’s.
            </p>
            <h3>Local storage</h3>
            <p>
              Preferences and saved figure settings are stored in this browser only. They
              are not synchronised between users or devices, and are not sent anywhere.
              Use the shareable URL to give someone else the same view.
            </p>
            <h3>Reproducibility</h3>
            <p>
              Every analytical choice is encoded in the URL, and every figure can be
              downloaded with a JSON specification recording the indicator, geography,
              period, benchmark, classification breakpoints, source and retrieval date.
              The data-preparation and validation scripts in the repository regenerate the
              bundled dataset from the sources above.
            </p>
          </Prose>
        </TabsContent>
        <TabsContent value="team">
          <TeamSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="max-w-3xl space-y-3 text-sm leading-relaxed text-slate-700
                 [&_h3]:mt-5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-oxford-900
                 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-oxford-900
                 [&_ul]:list-outside [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5"
    >
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-700">
        {value}
      </dd>
    </div>
  );
}

/** The claim ladder: what this product supports and what it does not. */
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
      body: 'X causes Y, or changing X would change Y. Nothing in this atlas can support this. It requires evidence of effect from study designs this product does not contain.',
    },
  ];
  return (
    <ul className="not-prose my-4 space-y-2">
      {rungs.map((rung) => (
        <li
          key={rung.label}
          className={`border-l-2 pl-3 ${
            rung.supported ? 'border-brass-600' : 'border-amber-500'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-oxford-900">{rung.label}</span>
            <Badge tone={rung.supported ? 'brass' : 'warn'}>
              {rung.supported ? 'supported here' : 'not supported here'}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{rung.body}</p>
        </li>
      ))}
    </ul>
  );
}
