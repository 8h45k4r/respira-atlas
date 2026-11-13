import { useMemo, useState } from 'react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import type { CoverageStatus } from '@/data/schemas/manifest';
import { Badge } from '@/components/ui/misc';
import { Info, Filter } from 'lucide-react';
import { Reveal } from '@/components/motion/motion';
import { StatCallouts } from '@/components/infographics/infographics';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const STATUS_STYLE: Record<CoverageStatus, { label: string; cell: string; symbol: string }> = {
  data: { label: 'Data available', cell: 'bg-brass-600 text-white', symbol: '●' },
  'no-data': { label: 'Geography exists, indicator not published', cell: 'bg-slate-200 text-slate-700', symbol: '○' },
  'boundary-only': { label: 'Boundary only — nation not covered by this dataset', cell: 'bg-white text-slate-500 border border-dashed border-slate-400', symbol: '/' },
  'not-applicable': { label: 'Geography type does not exist in this nation', cell: 'bg-white text-slate-400', symbol: '–' },
  suppressed: { label: 'Suppressed by the publisher', cell: 'bg-amber-200 text-amber-900', symbol: '×' },
};

/**
 * The coverage matrix: indicator × nation × geography × period.
 *
 * This exists so a user can see exactly what is and is not published before
 * drawing a conclusion from an empty area on a map. It is built from the
 * prepared data, not from a hand-maintained list.
 */
export function CoverageView({
  catalogue, state, onChange,
}: {
  catalogue: Catalogue;
  state: AtlasState;
  onChange: (patch: Partial<AtlasState>) => void;
}) {
  const { coverage, manifest, indicators } = catalogue;
  const covered = manifest.coverage.nationsWithData;
  // Default to the covered nation: other nations are boundary-only for every
  // indicator, which the nation tiles above the table already show at a glance.
  const [nation, setNation] = useState<string>(covered[0] ?? 'all');

  const nations = useMemo(
    () => [...new Set(coverage.matrix.map((row) => row.nation))],
    [coverage.matrix],
  );
  const areaTypeKeys = useMemo(
    () => Object.keys(manifest.areaTypes),
    [manifest.areaTypes],
  );

  const rows = useMemo(() => {
    const byIndicator = new Map<number, Map<string, CoverageStatus>>();
    const periodsByCell = new Map<string, string[]>();
    for (const row of coverage.matrix) {
      if (nation !== 'all' && row.nation !== nation) continue;
      const cells = byIndicator.get(row.indicatorId) ?? new Map();
      const key = `${row.nation}|${row.areaTypeKey}`;
      cells.set(key, row.status);
      byIndicator.set(row.indicatorId, cells);
      periodsByCell.set(`${row.indicatorId}|${key}`, row.periods);
    }
    return { byIndicator, periodsByCell };
  }, [coverage.matrix, nation]);

  const shownNations = nation === 'all' ? nations : [nation];

  // Per nation: how many indicator × geography cells carry data.
  const nationSummary = nations.map((item) => {
    const cells = coverage.matrix.filter((row) => row.nation === item);
    const withData = cells.filter((row) => row.status === 'data').length;
    return { nation: item, withData, total: cells.length };
  });
  const dataCells = coverage.matrix.filter((row) => row.status === 'data');
  const indicatorsWithData = new Set(dataCells.map((row) => row.indicatorId)).size;
  const topicOrder = Object.keys(manifest.topics);
  const grouped = topicOrder
    .map((topic) => ({
      topic,
      label: manifest.topics[topic]?.label ?? topic,
      items: indicators.filter((indicator) => indicator.topic === topic),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="shell py-6">
      <Reveal as="header" className="max-w-3xl">
        <p className="label-caps">Coverage</p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.015em] text-oxford-900">
          What is published, where, and for which periods
        </h2>
        <p className="sr-only">{manifest.coverage.statement}</p>
      </Reveal>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <StatCallouts
          items={[
            { value: indicatorsWithData, label: 'indicators with published data', emphasis: true },
            { value: dataCells.length, label: 'indicator × geography combinations with data' },
            { value: manifest.excludedIndicators.length, label: 'candidates excluded, with reasons' },
          ]}
        />
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Coverage by nation">
          {nationSummary.map((item, index) => {
            const has = item.withData > 0;
            return (
              <Reveal as="li" key={item.nation} delay={index * 80}>
                <button
                  type="button"
                  aria-pressed={nation === item.nation}
                  onClick={() => setNation(item.nation)}
                  className={cn(
                    'flex h-full w-full flex-col rounded-xl border p-3 text-left transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700',
                    nation === item.nation ? 'border-brass-500 shadow-md' : 'border-slate-200 hover:border-oxford-300',
                    has ? 'bg-gradient-to-br from-oxford-700 to-oxford-900 text-white'
                      : 'bg-[repeating-linear-gradient(45deg,#ece9e4_0_1px,#ffffff_1px_6px)] text-slate-700',
                  )}
                >
                  <span className="text-sm font-semibold">{item.nation}</span>
                  <span className={cn('mt-auto pt-3 text-2xl font-semibold tabular-nums leading-none', has ? 'text-white' : 'text-slate-400')}>
                    {item.withData}
                  </span>
                  <span className={cn('font-figure text-[0.65rem]', has ? 'text-oxford-100' : 'text-slate-500')}>
                    {has ? 'combinations with data' : 'boundary only, no data'}
                  </span>
                </button>
              </Reveal>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="label-caps mr-1">Showing</span>
        {['all', ...nations].map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={nation === item}
            onClick={() => setNation(item)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 font-figure text-2xs transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700',
              nation === item ? 'border-oxford-900 bg-oxford-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-oxford-500',
            )}
          >
            {item === 'all' ? 'All UK nations' : item}
          </button>
        ))}
      </div>

      <ul className="my-3 flex flex-wrap gap-1.5">
        {(Object.keys(STATUS_STYLE) as CoverageStatus[]).map((status) => (
          <li key={status} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 font-figure text-2xs text-slate-700">
            <span
              aria-hidden
              className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] ${STATUS_STYLE[status].cell}`}
            >
              {STATUS_STYLE[status].symbol}
            </span>
            {coverage.legend[status] ?? STATUS_STYLE[status].label}
          </li>
        ))}
      </ul>

      <div className="overflow-auto border border-slate-200 scrollbar-thin">
        <table className="w-full border-collapse text-left font-figure text-2xs">
          <caption className="sr-only">
            Coverage matrix: indicator by nation by geography, with the number of periods
            published in each cell.
          </caption>
          <thead>
            <tr className="border-b border-slate-300 bg-slate-50">
              <th scope="col" className="sticky left-0 z-10 min-w-[16rem] bg-slate-50 px-2 py-2 font-semibold text-slate-700">
                Indicator
              </th>
              {shownNations.map((item) =>
                areaTypeKeys.map((key) => (
                  <th
                    key={`${item}-${key}`}
                    scope="col"
                    className="px-2 py-2 text-center font-semibold text-slate-700"
                  >
                    <span className="block">{manifest.areaTypes[key].shortLabel}</span>
                    <span className="block font-normal text-slate-500">{item}</span>
                  </th>
                )),
              )}
            </tr>
          </thead>
          {grouped.map((group) => (
          <tbody key={group.topic}>
            <tr className="bg-slate-50/80">
              <th scope="rowgroup" colSpan={1 + shownNations.length * areaTypeKeys.length}
                className="sticky left-0 px-2 pb-1 pt-3 text-left font-semibold uppercase tracking-[0.05em] text-oxford-700">
                {group.label}
                <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-500">{group.items.length}</span>
              </th>
            </tr>
            {group.items.map((indicator) => {
              const cells = rows.byIndicator.get(indicator.id);
              return (
                <tr key={indicator.id} className="border-b border-slate-100 transition-colors hover:bg-oxford-50/50">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white px-2 py-1.5 font-normal text-oxford-900"
                  >
                    <button
                      type="button"
                      className="text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700"
                      onClick={() =>
                        onChange({
                          mode: 'explore',
                          indicatorId: indicator.id,
                          period: null,
                          areaTypeKey: Object.keys(indicator.geographies)[0] ?? null,
                          geographyMode:
                            manifest.areaTypes[Object.keys(indicator.geographies)[0] ?? '']
                              ?.mode ?? state.geographyMode,
                        })
                      }
                    >
                      {indicator.shortName}
                    </button>
                    <span className="block text-slate-500">
                      {indicator.domainLabel} · {indicator.unit} · {indicator.yearType} year
                    </span>
                  </th>
                  {shownNations.map((item) =>
                    areaTypeKeys.map((key) => {
                      const status = cells?.get(`${item}|${key}`) ?? 'not-applicable';
                      const periods =
                        rows.periodsByCell.get(`${indicator.id}|${item}|${key}`) ?? [];
                      const style = STATUS_STYLE[status];
                      return (
                        <td key={`${item}-${key}`} className="px-1 py-1 text-center">
                          <span
                            className={`inline-flex min-w-[3.2rem] items-center justify-center rounded px-1 py-0.5 ${style.cell}`}
                            title={`${coverage.legend[status] ?? style.label}${
                              periods.length > 0
                                ? ` — ${periods.length} periods, latest ${periods[periods.length - 1]}`
                                : ''
                            }`}
                          >
                            {status === 'data' ? `${periods.length}` : style.symbol}
                          </span>
                        </td>
                      );
                    }),
                  )}
                </tr>
              );
            })}
          </tbody>
          ))}
        </table>
      </div>
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 font-figure text-2xs text-slate-600">
        <Info className="h-3 w-3" aria-hidden />Number = published periods · hover a cell for the latest
      </p>

      {manifest.excludedIndicators.length > 0 ? (
        <section className="mt-8">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-oxford-900">
            <Filter className="h-4 w-4 text-brass-600" aria-hidden />
            Candidate indicators excluded from this release
          </h3>
          <p className="sr-only">
            These were resolved from the source catalogue but are not published here. The
            reason is recorded at data-preparation time rather than assumed.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {manifest.excludedIndicators.map((excluded, index) => (
              <Reveal as="li" key={excluded.id} delay={index * 70} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-figure text-xs font-semibold text-oxford-900">
                    Indicator {excluded.id}
                  </span>
                  {excluded.verifiedEmpty ? (
                    <Badge tone="warn">source inconsistency</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-2xs leading-relaxed text-slate-700">{excluded.reason}</p>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange({ mode: 'methods' })}>
          Read the methods and limitations
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={manifest.sources.fingertips?.profileUrl} target="_blank" rel="noreferrer noopener">
            Open the source profile
          </a>
        </Button>
      </div>
    </div>
  );
}
