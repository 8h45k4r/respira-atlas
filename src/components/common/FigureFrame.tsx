import { type ReactNode, useId, useState } from 'react';
import { Download, Table2, Info } from 'lucide-react';
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
  question, indicatorName, meta, evidence, limitation, coverageLabel,
  children, table, onExport, exportLabel = 'Export figure',
  accessibleDescription, className, actions,
}: FigureFrameProps) {
  const headingId = useId();
  const [tableOpen, setTableOpen] = useState(false);

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

      {/* Population, period, geography, unit and source are always visible. */}
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 bg-slate-50/60 px-4 py-2 figure-meta">
        <MetaItem label="Population" value={meta.population} />
        <MetaItem label="Period" value={meta.period} />
        <MetaItem
          label="Geography"
          value={
            meta.boundaryVintage
              ? `${meta.geography} (${meta.boundaryVintage} boundaries)`
              : meta.geography
          }
        />
        <MetaItem label="Unit" value={meta.unit} />
        <MetaItem label="Source" value={meta.source} />
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

      <div className="flex items-start gap-2 border-t border-slate-200 bg-amber-50/40 px-4 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
        <p className="font-figure text-2xs leading-relaxed text-amber-950">
          <span className="font-semibold">Limitation.</span> {limitation}
        </p>
      </div>
    </figure>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="font-semibold uppercase tracking-[0.05em] text-slate-500">{label}</dt>
      <dd className="text-slate-700">{value}</dd>
    </div>
  );
}
