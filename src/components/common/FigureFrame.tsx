import { type ReactNode, useId, useState } from 'react';
import {
  Download, Table2, Users, CalendarRange, MapPinned, Ruler, Database, ChevronDown,
} from 'lucide-react';
import { CaveatChips, type Caveat } from './CaveatChips';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, Badge } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

export interface FigureMeta {
  readonly population: string;
  readonly period: string;
  readonly geography: string;
  readonly unit: string;
  readonly source: string;
  readonly boundaryVintage?: string | null;
}

export interface FigureFrameProps {
  /** The analytical question this figure answers. */
  readonly question: string;
  readonly indicatorName?: string;
  readonly meta: FigureMeta;
  /** One-sentence evidence statement shown directly under the visual. */
  readonly evidence?: ReactNode;
  /** The limitation or uncertainty statement. Required: never optional in practice. */
  readonly limitation: ReactNode;
  /**
   * The limitation as short, always-visible icon chips. When given, the full
   * limitation text sits one click away ("Why?") instead of as a paragraph;
   * it is still in the page for assistive technology and in print.
   */
  readonly caveats?: readonly Caveat[];
  readonly coverageLabel?: string | null;
  readonly children: ReactNode;
  readonly table?: ReactNode;
  readonly onExport?: () => void;
  readonly exportLabel?: string;
  readonly accessibleDescription?: string;
  readonly className?: string;
  readonly actions?: ReactNode;
}

/**
 * The standard frame every visual in the atlas sits in.
 *
 * It enforces the parts a figure must have to be defensible on its own: the
 * question it answers, the population, period, geography and unit it applies
 * to, its source, a limitation statement, a text/table alternative, and a
 * working export. A visual cannot be added to this product without them.
 */
export function FigureFrame({
  question, indicatorName, meta, evidence, limitation, caveats, coverageLabel,
  children, table, onExport, exportLabel = 'Export figure',
  accessibleDescription, className, actions,
}: FigureFrameProps) {
  const headingId = useId();
  const whyId = useId();
  const [tableOpen, setTableOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  return (
    <figure
      className={cn('panel flex min-w-0 flex-col', className)}
      aria-labelledby={headingId}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-[0.95rem] font-semibold leading-snug text-oxford-900">
            {question}
          </h2>
          {indicatorName ? (
            <p className="mt-0.5 font-figure text-xs text-slate-600">{indicatorName}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 no-print">
          {actions}
          {table ? (
            <Dialog open={tableOpen} onOpenChange={setTableOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Table2 className="h-3.5 w-3.5" aria-hidden />
                  Data table
                </Button>
              </DialogTrigger>
              <DialogContent
                title="Data behind this figure"
                description={`${meta.geography} — ${meta.period}. Availability is stated for every area; a blank value is not a zero.`}
              >
                {table}
              </DialogContent>
            </Dialog>
          ) : null}
          {onExport ? (
            <Button variant="brass" size="sm" onClick={onExport}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              {exportLabel}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Population, period, geography, unit and source: always visible, as chips. */}
      <dl className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50/60 px-4 py-1.5 figure-meta">
        <MetaChip icon={Users} label="Population" value={meta.population} />
        <MetaChip icon={CalendarRange} label="Period" value={meta.period} />
        <MetaChip
          icon={MapPinned}
          label="Geography"
          value={
            meta.boundaryVintage
              ? `${meta.geography} (${meta.boundaryVintage} boundaries)`
              : meta.geography
          }
        />
        <MetaChip icon={Ruler} label="Unit" value={meta.unit} />
        <MetaChip icon={Database} label="Source" value={meta.source} />
        {coverageLabel ? (
          <Badge tone="warn" className="ml-auto">{coverageLabel}</Badge>
        ) : null}
      </dl>

      <div className="min-w-0 flex-1 p-1">{children}</div>

      {accessibleDescription ? (
        <p className="sr-only">{accessibleDescription}</p>
      ) : null}

      {evidence ? (
        <figcaption className="border-t border-slate-200 px-4 py-3 prose-evidence">
          {evidence}
        </figcaption>
      ) : null}

      {caveats && caveats.length > 0 ? (
        <div className="border-t border-slate-200 bg-amber-50/40 px-4 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <CaveatChips caveats={caveats} />
            <button
              type="button"
              aria-expanded={whyOpen}
              aria-controls={whyId}
              onClick={() => setWhyOpen((open) => !open)}
              className="ml-auto inline-flex items-center gap-0.5 rounded font-figure text-2xs font-semibold text-amber-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-700 no-print"
            >
              Why?
              <ChevronDown
                className={cn('h-3 w-3 transition-transform', whyOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
          </div>
          <p
            id={whyId}
            className={cn(
              'mt-1.5 font-figure text-2xs leading-relaxed text-amber-950',
              !whyOpen && 'hidden print:block',
            )}
          >
            <span className="font-semibold">Limitation.</span> {limitation}
          </p>
          {/* Screen readers always get the full limitation. */}
          {!whyOpen ? <p className="sr-only">Limitation. {limitation}</p> : null}
        </div>
      ) : (
        <div className="flex items-start gap-2 border-t border-slate-200 bg-amber-50/40 px-4 py-2.5">
          <p className="font-figure text-2xs leading-relaxed text-amber-950">
            <span className="font-semibold">Limitation.</span> {limitation}
          </p>
        </div>
      )}
    </figure>
  );
}

function MetaChip({
  icon: Icon, label, value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div
      className="inline-flex min-w-0 max-w-[14rem] items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5"
      title={`${label}: ${value}`}
    >
      <dt className="sr-only">{label}</dt>
      <Icon className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
      <dd className="truncate text-slate-700">{value}</dd>
    </div>
  );
}
