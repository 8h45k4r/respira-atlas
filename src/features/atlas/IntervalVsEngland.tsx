import type { Indicator } from '@/data/schemas/manifest';
import type { PresentObservation } from '@/data/schemas/observation';
import { intervalAt, type FlagLevel } from '@/data/selectors/flag-level';
import { formatValue } from '@/data/selectors/format';
import { allowsQualitativeReading } from '@/data/selectors/comparison';
import { CHART_INK, SELECTION } from '@/charts/palette';

const W = 280;
const H = 74;
const PAD = 14;
const AXIS_Y = 40;

/**
 * The area against England, drawn rather than described.
 *
 * One strip shows the estimate, its interval and England's value on a common
 * scale. Where the publisher's flag follows the 99.8% interval, both intervals
 * are drawn — the 99.8% as a thin outer line, the 95% as a thick inner bar — so
 * a "similar" flag beside a 95% bar that misses England explains itself. The
 * flag itself is the dot's fill: solid for different, hollow for similar.
 */
export function IntervalVsEngland({
  observation, england, indicator, flagLevel, benchmarkLabel = 'England',
}: {
  observation: PresentObservation;
  england: PresentObservation;
  indicator: Indicator;
  flagLevel: FlagLevel;
  benchmarkLabel?: string;
}) {
  const i95 = intervalAt(observation, 95);
  const exactLevel = flagLevel.basis === 'exact' ? flagLevel.level : null;
  const i998 = exactLevel === 99.8 ? intervalAt(observation, 99.8) : null;

  const values = [observation.value, england.value];
  for (const interval of [i95, i998]) if (interval) values.push(interval.lower, interval.upper);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const span = hi - lo || Math.abs(hi) * 0.1 || 1;
  lo -= span * 0.12;
  hi += span * 0.12;
  const x = (value: number) => PAD + ((value - lo) / (hi - lo)) * (W - PAD * 2);

  const flag = observation.significance;
  const compared = flag !== 'not-compared';
  const different = compared && flag !== 'similar';
  // Better/worse is repeated only where the measure supports that reading
  // (never for recorded prevalence); otherwise the flag reads as "different".
  const qualitative = flag === 'better' || flag === 'worse';
  const flagText = !compared
    ? 'Not compared with England by the publisher'
    : !different
      ? `Flagged similar to ${benchmarkLabel}`
      : qualitative && !allowsQualitativeReading(indicator)
        ? `Flagged different from ${benchmarkLabel}`
        : `Flagged ${flag} than ${benchmarkLabel}`;
  const levelText = compared && exactLevel ? ` · test uses the ${exactLevel}% interval` : '';

  const ex = x(england.value);
  const ox = x(observation.value);
  const englandLabel = `${benchmarkLabel} ${formatValue(england.value, indicator)}`;
  const englandAnchor = ex > W - 80 ? 'end' : ex < 80 ? 'start' : 'middle';

  return (
    <figure className="mt-2" aria-label={`${flagText}${levelText}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden>
        {/* England reference */}
        <line x1={ex} y1={14} x2={ex} y2={AXIS_Y + 14} stroke={CHART_INK.benchmark}
          strokeWidth={1.4} strokeDasharray="3 2.5" />
        <text x={ex} y={10} fontSize={9.5} fill={CHART_INK.benchmark} fontWeight={600}
          textAnchor={englandAnchor}>{englandLabel}</text>

        {/* 99.8% outer interval, only where the flag uses it */}
        {i998 ? (
          <g stroke={SELECTION.stroke} strokeWidth={1.2}>
            <line x1={x(i998.lower)} y1={AXIS_Y} x2={x(i998.upper)} y2={AXIS_Y} />
            <line x1={x(i998.lower)} y1={AXIS_Y - 5} x2={x(i998.lower)} y2={AXIS_Y + 5} />
            <line x1={x(i998.upper)} y1={AXIS_Y - 5} x2={x(i998.upper)} y2={AXIS_Y + 5} />
          </g>
        ) : null}
        {/* 95% interval: thick bar */}
        {i95 ? (
          <line x1={x(i95.lower)} y1={AXIS_Y} x2={x(i95.upper)} y2={AXIS_Y}
            stroke={SELECTION.stroke} strokeWidth={i998 ? 5 : 3} strokeLinecap="round"
            opacity={i998 ? 0.45 : 1} />
        ) : null}
        {/* Estimate; fill carries the publisher's flag */}
        {compared && !different ? (
          <circle cx={ox} cy={AXIS_Y} r={5} fill="#ffffff" stroke={SELECTION.stroke} strokeWidth={2} />
        ) : compared ? (
          <circle cx={ox} cy={AXIS_Y} r={5} fill={SELECTION.stroke} stroke="#ffffff" strokeWidth={1} />
        ) : (
          <line x1={ox} y1={AXIS_Y - 6} x2={ox} y2={AXIS_Y + 6} stroke={SELECTION.stroke} strokeWidth={2.6} />
        )}

        {/* Interval key, drawn */}
        <g fontSize={9} fill={CHART_INK.mutedText}>
          {i95 ? (
            <>
              <line x1={PAD} y1={H - 6} x2={PAD + 14} y2={H - 6} stroke={SELECTION.stroke}
                strokeWidth={i998 ? 5 : 3} opacity={i998 ? 0.45 : 1} strokeLinecap="round" />
              <text x={PAD + 19} y={H - 3}>95%</text>
            </>
          ) : null}
          {i998 ? (
            <>
              <line x1={PAD + 48} y1={H - 6} x2={PAD + 62} y2={H - 6} stroke={SELECTION.stroke} strokeWidth={1.2} />
              <text x={PAD + 67} y={H - 3}>99.8% (used by the flag)</text>
            </>
          ) : null}
        </g>
      </svg>
      <figcaption className="mt-0.5 flex items-center gap-1.5 font-figure text-2xs text-slate-700">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          {compared && !different ? (
            <circle cx="5" cy="5" r="3.6" fill="#fff" stroke={SELECTION.stroke} strokeWidth="1.6" />
          ) : compared ? (
            <circle cx="5" cy="5" r="4" fill={SELECTION.stroke} />
          ) : (
            <line x1="5" y1="1" x2="5" y2="9" stroke={SELECTION.stroke} strokeWidth="2" />
          )}
        </svg>
        <span>
          <span className="font-semibold text-oxford-900">{flagText}</span>
          <span className="text-slate-500">{levelText}</span>
        </span>
      </figcaption>
    </figure>
  );
}
