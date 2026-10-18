import { useMemo, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Image, FileCode } from 'lucide-react';
import type { AtlasState } from '@/state/atlas-state';
import { stateToUrl } from '@/state/atlas-state';
import type { ResolvedSelection, Analysis } from '@/features/atlas/useAnalysis';
import { Dialog, DialogContent, Label, Badge } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { renderMapSvg } from '@/export/map-svg';
import { buildFigureSpec, type FigureComposition, TEXT_SCALES } from '@/export/figure-spec';
import {
  downloadSvg, downloadPng, downloadCsv, downloadJson,
  buildFilteredCsv, ExportError,
} from '@/export/download';
import { slug } from '@/lib/utils';

const COMPOSITIONS: { value: FigureComposition; label: string; hint: string }[] = [
  { value: 'plot-only', label: 'Map only', hint: 'No titles or notes — for a figure you will caption yourself' },
  { value: 'figure', label: 'Figure with title, legend and notes', hint: 'Self-contained and citable' },
  { value: 'presentation', label: 'Presentation slide', hint: '1280 × 720, legend beside the map' },
  { value: 'a4-brief', label: 'A4 evidence brief page', hint: '794 × 1123 at 96 dpi' },
];

/**
 * Export composer.
 *
 * A preview of the actual export output is shown before anything downloads, so
 * nothing is a surprise, and the preview is produced by the same renderer as the
 * file — there is no separate "preview mode" that could differ from the result.
 */
export function ExportDialog({
  open, onOpenChange, state, selection, analysis,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: AtlasState;
  selection: ResolvedSelection;
  analysis: Analysis;
}) {
  const [composition, setComposition] = useState<FigureComposition>('figure');
  const [textScale, setTextScale] = useState<keyof typeof TEXT_SCALES>('standard');
  const [headline, setHeadline] = useState('');
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const evidenceSentence = useMemo(() => {
    if (!includeEvidence || !analysis.evidence || analysis.evidence.unavailable) return null;
    return [analysis.evidence.observed, analysis.evidence.comparison]
      .filter(Boolean)
      .join(' ');
  }, [includeEvidence, analysis.evidence]);

  const svg = useMemo(
    () =>
      renderMapSvg({
        viewModel: analysis.viewModel,
        notes: analysis.notes,
        composition,
        textScale,
        headline: headline.trim() === '' ? null : headline.trim(),
        headlineIsUserAuthored: headline.trim() !== '',
        evidenceSentence,
      }),
    [analysis.viewModel, analysis.notes, composition, textScale, headline, evidenceSentence],
  );

  const basename = `${slug(selection.indicator.shortName)}-${slug(selection.areaType.key)}-${slug(analysis.period)}`;

  const spec = useMemo(
    () =>
      buildFigureSpec({
        composition, textScale,
        headline: headline.trim() === '' ? null : headline.trim(),
        question: analysis.question,
        state: { ...state, period: analysis.period },
        shareUrl: stateToUrl({ ...state, period: analysis.period }),
        notes: analysis.notes,
        classification: analysis.viewModel.classification,
        evidence: analysis.evidence,
        viewModel: analysis.viewModel,
      }),
    [composition, textScale, headline, analysis, state],
  );

  const run = async (action: () => void | Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof ExportError
          ? caught.message
          : `The export failed: ${caught instanceof Error ? caught.message : String(caught)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Export this figure"
        description="Exports reflect the current selection exactly. Source, method, period, benchmark and limitation notes are always included."
      >
        <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="space-y-3.5">
            <div>
              <Label htmlFor="composition">Composition</Label>
              <Select
                value={composition}
                onValueChange={(value) => setComposition(value as FigureComposition)}
              >
                <SelectTrigger id="composition" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPOSITIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} hint={option.hint}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="text-scale">Text size</Label>
              <Select
                value={textScale}
                onValueChange={(value) => setTextScale(value as keyof typeof TEXT_SCALES)}
              >
                <SelectTrigger id="text-scale" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact" hint="For a dense report figure">Compact</SelectItem>
                  <SelectItem value="standard" hint="Default">Standard</SelectItem>
                  <SelectItem value="large" hint="For projection or print at distance">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="headline">Headline (optional)</Label>
              <textarea
                id="headline"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                rows={2}
                maxLength={180}
                placeholder="Write your own headline, or leave blank to use the analytical question"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm
                           text-oxford-900 placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-brass-700 focus:ring-offset-1"
              />
              {headline.trim() !== '' ? (
                <p className="mt-1 text-2xs leading-relaxed text-amber-800">
                  Your headline will be labelled on the figure as written by the user of
                  this atlas, not by the data publisher. The source and method notes
                  cannot be removed.
                </p>
              ) : null}
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={includeEvidence}
                onChange={(event) => setIncludeEvidence(event.target.checked)}
                disabled={!analysis.evidence || Boolean(analysis.evidence.unavailable)}
                className="mt-0.5 h-3.5 w-3.5 accent-brass-700"
              />
              <span>
                Include the evidence statement
                {!analysis.evidence || analysis.evidence.unavailable ? (
                  <span className="block text-2xs text-slate-500">
                    Unavailable: no area with a value is selected.
                  </span>
                ) : null}
              </span>
            </label>

            <div className="rule space-y-2 pt-3">
              <Button
                className="w-full"
                variant="brass"
                disabled={busy}
                onClick={() => run(() => downloadSvg(svg, basename))}
              >
                <FileCode className="h-3.5 w-3.5" aria-hidden />
                Download SVG (vector)
              </Button>
              <Button
                className="w-full"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => downloadPng(svg, basename, { scale: 3 }))}
              >
                <Image className="h-3.5 w-3.5" aria-hidden />
                Download PNG (3× resolution)
              </Button>
              <Button
                className="w-full"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(() =>
                    downloadCsv(
                      buildFilteredCsv(
                        analysis.viewModel, selection.indicator,
                        analysis.notes, analysis.period,
                      ),
                      basename,
                    ),
                  )
                }
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
                Download CSV (filtered data)
              </Button>
              <Button
                className="w-full"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => downloadJson(spec, `${basename}-figure-spec`))}
              >
                <FileJson className="h-3.5 w-3.5" aria-hidden />
                Download figure specification (JSON)
              </Button>
            </div>

            {error ? (
              <p className="border border-destructive/30 bg-destructive/5 p-2 text-2xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <p className="font-figure text-2xs leading-relaxed text-slate-500">
              The SVG contains real vector paths and selectable text. The PNG is
              rasterised from that same vector figure, not captured from the screen, so
              no menus, tooltips or loading states can appear in it.
            </p>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="label-caps">Preview</h3>
              <Badge tone="neutral">
                {composition === 'presentation' ? '1280 × 720' :
                 composition === 'a4-brief' ? 'A4 at 96 dpi' : 'scaled to fit'}
              </Badge>
            </div>
            <div
              className="max-h-[58vh] overflow-auto border border-slate-200 bg-white p-2 scrollbar-thin
                         [&_svg]:h-auto [&_svg]:w-full"
              // Generated by this application's own renderer from validated data.
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="mt-2 font-figure text-2xs text-slate-500">
              <Download className="mr-1 inline h-3 w-3" aria-hidden />
              This is the exported figure itself, rendered by the same code that writes
              the file.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
