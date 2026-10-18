import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, FileQuestion, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoadingState({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin text-teal-700" aria-hidden />
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}

/** Every load failure is recoverable and says what failed. */
export function ErrorState({
  title, error, onRetry,
}: {
  title: string;
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <div className="panel m-1 border-destructive/30 bg-destructive/[0.03] p-5" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{error.message}</p>
          {onRetry ? (
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Shown where a chart is not supported by the data, instead of inventing values. */
export function UnsupportedState({
  title, explanation, action,
}: {
  title: string;
  explanation: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-40 flex-col items-start gap-2 border border-dashed border-slate-300 bg-slate-50/60 p-5">
      <div className="flex items-center gap-2">
        <Ban className="h-3.5 w-3.5 text-slate-500" aria-hidden />
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      </div>
      <div className="text-xs leading-relaxed text-slate-700">{explanation}</div>
      {action}
    </div>
  );
}

export function EmptyState({ title, explanation }: { title: string; explanation: ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-8 text-center">
      <FileQuestion className="h-5 w-5 text-slate-400" aria-hidden />
      <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      <div className="max-w-md text-xs leading-relaxed text-slate-600">{explanation}</div>
    </div>
  );
}

/** Loud, unmissable banner shown whenever the dataset is not real. */
export function DemonstrationDataBanner() {
  return (
    <div
      className="border-b-2 border-amber-500 bg-amber-100 px-4 py-2 text-center"
      role="alert"
    >
      <p className="text-sm font-bold uppercase tracking-[0.08em] text-amber-950">
        Demonstration data — not real observations. Do not use for any decision or publication.
      </p>
    </div>
  );
}
