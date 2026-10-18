import type { EvidenceStatement } from '@/data/selectors/evidence';
import { Badge } from '@/components/ui/misc';

/**
 * Renders an evidence statement in its fixed four-part order:
 * what was observed, how it compares, what uncertainty remains, what would help.
 *
 * Descriptive findings, the benchmark comparison, uncertainty and open questions
 * are kept visually distinct so a reader never mistakes a comparison for a
 * causal claim or an open question for a conclusion.
 */
export function EvidencePanel({
  statement, compact = false,
}: {
  statement: EvidenceStatement;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Section
        label="What was observed"
        tone="descriptive"
        body={statement.observed}
      />
      {statement.comparison ? (
        <Section
          label="How it compares"
          tone="comparison"
          body={statement.comparison}
        />
      ) : null}
      <Section
        label="What uncertainty remains"
        tone="uncertainty"
        body={statement.uncertainty}
      />
      {!compact ? (
        <>
          <div>
            <h4 className="label-caps mb-1.5">
              What further evidence would help
              <Badge tone="muted" className="ml-2 normal-case tracking-normal">
                open questions, not findings
              </Badge>
            </h4>
            <ul className="list-outside list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-700">
              {statement.furtherEvidence.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="label-caps mb-1.5">Limitations</h4>
            <ul className="list-outside list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-700">
              {statement.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}

const TONES = {
  descriptive: 'border-l-navy-700',
  comparison: 'border-l-teal-600',
  uncertainty: 'border-l-amber-600',
} as const;

function Section({
  label, body, tone,
}: {
  label: string;
  body: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className={`border-l-2 pl-3 ${TONES[tone]}`}>
      <h4 className="label-caps mb-1">{label}</h4>
      <p className="text-sm leading-relaxed text-slate-700">{body}</p>
    </div>
  );
}

/** Provenance block, shown with every exportable statement. */
export function ProvenanceList({ statement }: { statement: EvidenceStatement }) {
  const { provenance } = statement;
  const rows: [string, string][] = [
    ['Indicator', `${provenance.indicatorName} (ID ${provenance.indicatorId})`],
    ['Measure', `${provenance.measureType}, ${provenance.unit}`],
    ['Population', provenance.population],
    ['Period', provenance.period],
    ['Geography', provenance.boundaryVintage
      ? `${provenance.geography} (${provenance.boundaryVintage} boundaries)`
      : provenance.geography],
    ['Benchmark', provenance.benchmark],
    ['Source', provenance.source],
    ['Publisher', provenance.publisher],
    ['Licence', provenance.licence],
    ['Retrieved', provenance.retrievedAt.slice(0, 10)],
  ];
  return (
    <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 gap-y-1 font-figure text-2xs">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-semibold uppercase tracking-[0.05em] text-slate-500">{label}</dt>
          <dd className="text-slate-700">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
