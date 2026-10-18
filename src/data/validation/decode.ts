import {
  encodedObservationsSchema,
  type EncodedObservations,
  type Observation,
  type ObservationState,
  type Significance,
  type TrendFlag,
} from '../schemas/observation';

const STATE_NAMES: readonly ObservationState[] = [
  'present', 'missing', 'suppressed', 'not-applicable',
];
const SIGNIFICANCE_NAMES: readonly Significance[] = [
  'not-compared', 'better', 'worse', 'similar', 'higher', 'lower',
];
const TREND_NAMES: readonly TrendFlag[] = [
  'not-available', 'no-significant-change', 'increasing',
  'increasing-worse', 'decreasing', 'decreasing-better',
];

export class DataIntegrityError extends Error {
  constructor(message: string, readonly detail?: unknown) {
    super(message);
    this.name = 'DataIntegrityError';
  }
}

/**
 * Decodes the columnar wire format into the discriminated union.
 *
 * A row whose state is not 'present' is constructed without a `value` property
 * at all, so there is no way to read a number off a suppressed or missing
 * observation even by mistake.
 */
export function decodeObservations(raw: unknown): Observation[] {
  const parsed = encodedObservationsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DataIntegrityError(
      'Observation payload failed schema validation',
      parsed.error.issues.slice(0, 5),
    );
  }
  const encoded: EncodedObservations = parsed.data;
  const { dictionaries: dict, columns: col, rowCount } = encoded;

  const nullable = (
    key: 'value' | 'lowerCi95' | 'upperCi95' | 'lowerCi998' | 'upperCi998' | 'count' | 'denominator',
    i: number,
  ): number | null => {
    const column = col[key];
    return column ? (column[i] ?? null) : null;
  };
  const interned = (
    key: 'categoryType' | 'category' | 'note',
    table: readonly string[],
    i: number,
  ): string | null => {
    const column = col[key];
    if (!column) return null;
    const id = column[i];
    return id === undefined || id === -1 ? null : (table[id] ?? null);
  };

  const rows: Observation[] = [];
  for (let i = 0; i < rowCount; i += 1) {
    const state = STATE_NAMES[col.state[i]];
    if (!state) {
      throw new DataIntegrityError(`Unknown observation state code ${col.state[i]} at row ${i}`);
    }
    const areaCode = dict.areas[col.area[i]];
    const period = dict.periods[col.period[i]];
    if (areaCode === undefined || period === undefined) {
      throw new DataIntegrityError(`Dangling dictionary reference at row ${i}`);
    }
    const common = {
      areaCode,
      period,
      sex: dict.sexes[col.sex[i]] ?? '',
      age: dict.ages[col.age[i]] ?? '',
      categoryType: interned('categoryType', dict.categoryTypes, i),
      category: interned('category', dict.categories, i),
      significance: SIGNIFICANCE_NAMES[col.significance?.[i] ?? 0] ?? 'not-compared',
      trend: TREND_NAMES[col.trend?.[i] ?? 0] ?? 'not-available',
      note: interned('note', dict.notes, i),
    } as const;

    if (state === 'present') {
      const value = nullable('value', i);
      if (value === null || !Number.isFinite(value)) {
        throw new DataIntegrityError(
          `Observation marked present but has no finite value (${areaCode} ${period})`,
        );
      }
      rows.push({
        ...common,
        state: 'present',
        value,
        lowerCi95: nullable('lowerCi95', i),
        upperCi95: nullable('upperCi95', i),
        lowerCi998: nullable('lowerCi998', i),
        upperCi998: nullable('upperCi998', i),
        count: nullable('count', i),
        denominator: nullable('denominator', i),
      });
    } else {
      rows.push({ ...common, state });
    }
  }
  return rows;
}
