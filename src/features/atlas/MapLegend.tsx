import type { Indicator } from '@/data/schemas/manifest';
import type { MapViewModel } from '@/charts/map-view-model';
import { Lock } from 'lucide-react';
import { unitLabel, formatValue } from '@/data/selectors/format';
import { SELECTION } from '@/charts/palette';

/**
 * The map key.
 *
 * Numeric breakpoints, the unit and the classification method are all shown,
 * because a choropleth is unreadable without them. Non-data classes are listed
 * below a divider and carry their pattern, so they can never be mistaken for a
 * position on the value scale.
 */
export function MapLegend({
  viewModel, indicator,
}: {
  viewModel: MapViewModel;
  indicator: Indicator;
}) {
  const valueClasses = viewModel.legend.filter((entry) => entry.kind === 'class');
  const nonDataClasses = viewModel.legend.filter((entry) => entry.kind === 'non-data');
  const maxCount = Math.max(1, ...valueClasses.map((entry) => entry.count ?? 0));

  return (
    <div className="flex flex-col gap-2 border-l border-slate-100 px-3 py-2">
      <div>
        <h3 className="label-caps">Key</h3>
        <p className="mt-0.5 font-figure text-2xs text-slate-600">
          {unitLabel(indicator) || 'value'}
        </p>
      </div>

      {valueClasses.length > 0 ? (
        <ul className="space-y-1">
          {valueClasses.map((entry, index) => (
            <li key={`${entry.label}-${index}`} className="flex items-center gap-2" title={entry.label}>
              <span
                aria-hidden
                className="h-3 w-5 shrink-0 border border-slate-400"
                style={{ background: entry.swatch }}
              />
              <span className="font-figure text-2xs tabular-nums text-slate-700">
                <span className="sr-only">{entry.label}</span>
                <span aria-hidden>
                  {entry.range
                    ? `${formatValue(entry.range[0], indicator)}–${formatValue(entry.range[1], indicator)}`
                    : entry.label}
                </span>
              </span>
              {entry.count !== null ? (
                <span className="ml-auto flex items-center gap-1" aria-label={`${entry.count} areas`}>
                  {/* Count as a bar: equal bars for quantiles, a distribution otherwise. */}
                  <span
                    aria-hidden
                    className="h-1.5 rounded-sm bg-slate-300"
                    style={{ width: `${Math.max(2, (entry.count / maxCount) * 28)}px` }}
                  />
                  <span className="w-5 text-right font-figure text-2xs tabular-nums text-slate-400">
                    {entry.count}
                  </span>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-figure text-2xs text-slate-500">
          No area carries a value for this selection, so no colour scale is drawn.
        </p>
      )}

      {nonDataClasses.length > 0 ? (
        <>
          <div className="rule" />
          <ul className="space-y-1">
            {nonDataClasses.map((entry) => (
              <li key={entry.label} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-3 w-5 shrink-0 border border-slate-400"
                  style={{
                    background: entry.swatch,
                    backgroundImage:
                      entry.pattern === 'hatch'
                        ? 'repeating-linear-gradient(90deg,#94a3b8 0 1px,transparent 1px 4px)'
                        : entry.pattern === 'diagonal'
                          ? 'repeating-linear-gradient(45deg,#b6c2d1 0 1px,transparent 1px 5px)'
                          : undefined,
                  }}
                />
                <span className="font-figure text-2xs text-slate-700">{entry.label}</span>
                {entry.count !== null ? (
                  <span className="ml-auto font-figure text-2xs tabular-nums text-slate-400">
                    {entry.count}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="rule" />
      {viewModel.classification ? (
        <p className="flex flex-wrap items-center gap-1 font-figure text-2xs text-slate-600">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
            {viewModel.classification.methodLabel}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
            {viewModel.classification.classCount} classes
          </span>
          {viewModel.classification.scaleSource === 'fixed-reference' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-brass-300 bg-brass-50 px-2 py-0.5 text-brass-800">
              <Lock className="h-2.5 w-2.5" aria-hidden /> fixed scale
            </span>
          ) : null}
        </p>
      ) : null}
      <p className="sr-only">{viewModel.classificationNote}</p>
      {/* Outlines, drawn: they mark selection and never change what a fill means. */}
      <ul className="space-y-1 font-figure text-2xs text-slate-600" aria-label="Outlines">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-5 shrink-0 bg-slate-100" style={{ outline: `2px solid ${SELECTION.comparisonStrokes[0]}`, outlineOffset: '-2px' }} />
          Selected area
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="flex shrink-0 gap-0.5">
            {SELECTION.comparisonStrokes.slice(1).map((colour) => (
              <span key={colour} className="h-3 w-1.5 bg-slate-100" style={{ outline: `2px solid ${colour}`, outlineOffset: '-2px' }} />
            ))}
          </span>
          Compared areas
        </li>
      </ul>
    </div>
  );
}
