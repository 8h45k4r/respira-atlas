import type { Indicator } from '@/data/schemas/manifest';
import type { MapViewModel } from '@/charts/map-view-model';
import { unitLabel } from '@/data/selectors/format';

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
            <li key={`${entry.label}-${index}`} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-3 w-5 shrink-0 border border-slate-400"
                style={{ background: entry.swatch }}
              />
              <span className="font-figure text-2xs tabular-nums text-slate-700">
                {entry.label}
              </span>
              {entry.count !== null ? (
                <span className="ml-auto font-figure text-2xs tabular-nums text-slate-400">
                  {entry.count}
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
      <p className="font-figure text-2xs leading-relaxed text-slate-500">
        {viewModel.classificationNote}
      </p>
      <p className="font-figure text-2xs leading-relaxed text-slate-500">
        A selected area is marked by a dark outline. The outline does not change
        what the fill colour means.
      </p>
    </div>
  );
}
