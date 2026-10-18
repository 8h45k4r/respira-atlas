import { useMemo, useState } from 'react';
import type { Catalogue } from '@/hooks/useAtlasCatalogue';
import type { AtlasState } from '@/state/atlas-state';
import type { CoverageStatus } from '@/data/schemas/manifest';
import { Badge, Label } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

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
  const [nation, setNation] = useState<string>('all');

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

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="label-caps">Coverage</p>
          <h2 className="mt-1 text-lg font-semibold leading-tight text-oxford-900">
            What is published, where, and for which periods
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {manifest.coverage.statement}
          </p>
        </div>
        <div className="w-full max-w-[14rem]">
          <Label htmlFor="coverage-nation">Nation</Label>
          <Select value={nation} onValueChange={setNation}>
            <SelectTrigger id="coverage-nation" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All UK nations</SelectItem>
              {nations.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5">
        {(Object.keys(STATUS_STYLE) as CoverageStatus[]).map((status) => (
          <li key={status} className="flex items-center gap-1.5 font-figure text-2xs text-slate-700">
            <span
              aria-hidden
              className={`inline-flex h-4 w-4 items-center justify-center text-[10px] ${STATUS_STYLE[status].cell}`}
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
          <tbody>
            {indicators.map((indicator) => {
              const cells = rows.byIndicator.get(indicator.id);
              return (
                <tr key={indicator.id} className="border-b border-slate-100">
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
                            className={`inline-flex min-w-[3.2rem] items-center justify-center px-1 py-0.5 ${style.cell}`}
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
        </table>
      </div>
      <p className="mt-2 font-figure text-2xs text-slate-500">
        A number in a cell is the count of published periods. Hover or focus a cell for the
        latest period.
      </p>

      {manifest.excludedIndicators.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-oxford-900">
            Candidate indicators excluded from this release
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-700">
            These were resolved from the source catalogue but are not published here. The
            reason is recorded at data-preparation time rather than assumed.
          </p>
          <ul className="mt-2 space-y-2">
            {manifest.excludedIndicators.map((excluded) => (
              <li key={excluded.id} className="border border-slate-200 bg-slate-50/60 p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-figure text-xs font-semibold text-oxford-900">
                    Indicator {excluded.id}
                  </span>
                  {excluded.verifiedEmpty ? (
                    <Badge tone="warn">source inconsistency</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-2xs leading-relaxed text-slate-700">{excluded.reason}</p>
              </li>
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
