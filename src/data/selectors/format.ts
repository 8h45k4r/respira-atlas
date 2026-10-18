import type { Indicator } from '../schemas/manifest';

/**
 * Significant-figure formatting that keeps published precision visible without
 * inventing it. Source values arrive with more decimals than are meaningful for
 * reading; we round for display only and never for calculation.
 */
export function formatValue(
  value: number,
  indicator: Pick<Indicator, 'unit' | 'valueType'>,
): string {
  const decimals = displayDecimals(value, indicator);
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function displayDecimals(
  value: number,
  indicator: Pick<Indicator, 'unit' | 'valueType'>,
): number {
  const magnitude = Math.abs(value);
  if (indicator.unit === '%') return magnitude >= 10 ? 1 : 2;
  if (indicator.unit === 'µg/m3') return 1;
  if (magnitude >= 1000) return 0;
  if (magnitude >= 100) return 1;
  if (magnitude >= 1) return 2;
  return 3;
}

export function formatWithUnit(
  value: number,
  indicator: Pick<Indicator, 'unit' | 'valueType'>,
): string {
  const formatted = formatValue(value, indicator);
  if (!indicator.unit) return formatted;
  if (indicator.unit === '%') return `${formatted}%`;
  return `${formatted} ${indicator.unit}`;
}

export function formatCount(value: number): string {
  // Counts from directly standardised rate tables can be fractional (expected
  // events), so a fractional count is shown as such rather than rounded away.
  const decimals = Number.isInteger(value) ? 0 : 1;
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
}

export function formatInterval(
  lower: number,
  upper: number,
  indicator: Pick<Indicator, 'unit' | 'valueType'>,
): string {
  return `${formatValue(lower, indicator)} to ${formatValue(upper, indicator)}`;
}

/**
 * Unit as it should appear on an axis or legend title.
 *
 * Some measures are genuinely unitless — an index or score, for instance — and
 * fall back to the value type so the axis still says what kind of quantity it
 * is rather than going blank.
 */
export function unitLabel(indicator: Pick<Indicator, 'unit' | 'valueType'>): string {
  if (!indicator.unit) {
    return indicator.valueType ? indicator.valueType.toLowerCase() : 'value';
  }
  if (indicator.unit === '%') return 'per cent';
  return indicator.unit;
}

export function measureTypeLabel(indicator: Pick<Indicator, 'valueType'>): string {
  switch (indicator.valueType) {
    case 'Directly standardised rate':
      return 'Directly age-standardised rate';
    case 'Crude rate':
      return 'Crude rate';
    case 'Proportion':
      return 'Proportion';
    case 'Ratio':
      return 'Ratio';
    case 'Mean':
      return 'Mean';
    default:
      return indicator.valueType ?? 'Value';
  }
}

/** True when a percentage-point difference is a meaningful statement. */
export function isPercentageMeasure(indicator: Pick<Indicator, 'unit' | 'valueType'>): boolean {
  return indicator.unit === '%' &&
    (indicator.valueType === 'Proportion' || indicator.valueType === 'Ratio');
}

/** True when the measure is age-standardised, so crude comparisons are invalid. */
export function isAgeStandardised(indicator: Pick<Indicator, 'valueType'>): boolean {
  return indicator.valueType === 'Directly standardised rate' ||
    indicator.valueType === 'Indirectly standardised rate';
}

export function formatPeriodLabel(period: string, yearType: string | null): string {
  if (!yearType) return period;
  if (yearType === 'Financial' && /^\d{4}\/\d{2}$/.test(period)) return `${period} (financial year)`;
  return period;
}
