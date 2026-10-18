/**
 * Columnar encoding for observation files.
 *
 * An object-per-row JSON encoding cost ~450 bytes per observation, which put the
 * published dataset at 77 MB. The same rows encoded as parallel arrays against
 * shared dictionaries are roughly an order of magnitude smaller, and no field,
 * flag or state is dropped in the process — the decoder reconstructs each row
 * exactly, including the four distinct availability states.
 */

export const STATE_CODES = { present: 0, missing: 1, suppressed: 2, 'not-applicable': 3 };
export const STATE_NAMES = ['present', 'missing', 'suppressed', 'not-applicable'];

export const SIGNIFICANCE_CODES = {
  'not-compared': 0, better: 1, worse: 2, similar: 3, higher: 4, lower: 5,
};
export const SIGNIFICANCE_NAMES = [
  'not-compared', 'better', 'worse', 'similar', 'higher', 'lower',
];

export const TREND_CODES = {
  'not-available': 0, 'no-significant-change': 1, increasing: 2,
  'increasing-worse': 3, decreasing: 4, 'decreasing-better': 5,
};
export const TREND_NAMES = [
  'not-available', 'no-significant-change', 'increasing',
  'increasing-worse', 'decreasing', 'decreasing-better',
];

class Dictionary {
  constructor() { this.values = []; this.index = new Map(); }
  intern(value) {
    if (value === null || value === undefined) return -1;
    const existing = this.index.get(value);
    if (existing !== undefined) return existing;
    const id = this.values.length;
    this.values.push(value);
    this.index.set(value, id);
    return id;
  }
}

/**
 * @param rows normalised observations (see fingertips.normaliseObservation)
 * @returns { dictionaries, columns, rowCount }
 */
export function encodeObservations(rows) {
  const areas = new Dictionary();
  const periods = new Dictionary();
  const sexes = new Dictionary();
  const ages = new Dictionary();
  const categoryTypes = new Dictionary();
  const categories = new Dictionary();
  const notes = new Dictionary();

  const columns = {
    area: [], period: [], sex: [], age: [], categoryType: [], category: [],
    state: [], value: [], lowerCi95: [], upperCi95: [], lowerCi998: [], upperCi998: [],
    count: [], denominator: [], significance: [], trend: [], note: [],
  };

  for (const row of rows) {
    columns.area.push(areas.intern(row.areaCode));
    columns.period.push(periods.intern(row.period));
    columns.sex.push(sexes.intern(row.sex || null));
    columns.age.push(ages.intern(row.age || null));
    columns.categoryType.push(categoryTypes.intern(row.categoryType));
    columns.category.push(categories.intern(row.category));
    columns.state.push(STATE_CODES[row.state]);
    columns.value.push(row.state === 'present' ? row.value : null);
    columns.lowerCi95.push(row.lowerCi95);
    columns.upperCi95.push(row.upperCi95);
    columns.lowerCi998.push(row.lowerCi998);
    columns.upperCi998.push(row.upperCi998);
    columns.count.push(row.count);
    columns.denominator.push(row.denominator);
    columns.significance.push(SIGNIFICANCE_CODES[row.significance] ?? 0);
    columns.trend.push(TREND_CODES[row.trend] ?? 0);
    columns.note.push(notes.intern(row.note));
  }

  // Columns that carry no information at all are omitted; the decoder treats a
  // missing column as uniformly null, so nothing is silently changed.
  const emptied = [];
  for (const key of [
    'lowerCi95', 'upperCi95', 'lowerCi998', 'upperCi998', 'count', 'denominator',
  ]) {
    if (columns[key].every((v) => v === null)) { delete columns[key]; emptied.push(key); }
  }
  for (const key of ['categoryType', 'category', 'note']) {
    if (columns[key].every((v) => v === -1)) { delete columns[key]; emptied.push(key); }
  }
  for (const key of ['significance', 'trend']) {
    if (columns[key].every((v) => v === 0)) { delete columns[key]; emptied.push(key); }
  }

  return {
    encoding: 'columnar-v1',
    rowCount: rows.length,
    dictionaries: {
      areas: areas.values,
      periods: periods.values,
      sexes: sexes.values,
      ages: ages.values,
      categoryTypes: categoryTypes.values,
      categories: categories.values,
      notes: notes.values,
    },
    omittedColumns: emptied,
    columns,
  };
}

/** Reference decoder, used by the validation script to prove a round trip. */
export function decodeObservations(encoded) {
  const d = encoded.dictionaries;
  const c = encoded.columns;
  const pick = (key, i) => (c[key] ? c[key][i] : null);
  const text = (dict, key, i) => {
    if (!c[key]) return null;
    const id = c[key][i];
    return id === -1 ? null : dict[id];
  };
  const rows = [];
  for (let i = 0; i < encoded.rowCount; i += 1) {
    rows.push({
      areaCode: d.areas[c.area[i]],
      period: d.periods[c.period[i]],
      sex: text(d.sexes, 'sex', i) ?? '',
      age: text(d.ages, 'age', i) ?? '',
      categoryType: text(d.categoryTypes, 'categoryType', i),
      category: text(d.categories, 'category', i),
      state: STATE_NAMES[c.state[i]],
      value: pick('value', i),
      lowerCi95: pick('lowerCi95', i),
      upperCi95: pick('upperCi95', i),
      lowerCi998: pick('lowerCi998', i),
      upperCi998: pick('upperCi998', i),
      count: pick('count', i),
      denominator: pick('denominator', i),
      significance: SIGNIFICANCE_NAMES[c.significance ? c.significance[i] : 0],
      trend: TREND_NAMES[c.trend ? c.trend[i] : 0],
      note: text(d.notes, 'note', i),
    });
  }
  return rows;
}
