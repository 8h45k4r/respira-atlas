import { fetchJson, fetchText, PrepareError } from './lib/fetch.mjs';
import { parseCsvWithHeader } from './lib/csv.mjs';
import { FINGERTIPS_BASE, ENGLAND_AREA_TYPE_ID } from './config.mjs';

/** Columns the pipeline depends on. A missing one is schema drift and aborts the run. */
const REQUIRED_COLUMNS = [
  'Indicator ID', 'Indicator Name', 'Area Code', 'Area Name', 'Area Type',
  'Sex', 'Age', 'Category Type', 'Category', 'Time period', 'Value',
  'Lower CI 95.0 limit', 'Upper CI 95.0 limit', 'Count', 'Denominator',
  'Value note', 'Recent Trend', 'Compared to England value or percentiles',
  'Time period Sortable', 'Time period range',
];

export async function fetchProfiles() {
  return fetchJson(`${FINGERTIPS_BASE}/profiles`);
}

export async function fetchAreaTypes() {
  return fetchJson(`${FINGERTIPS_BASE}/area_types`);
}

/** Authoritative per-indicator geography availability. Never inferred. */
export async function fetchAvailableAreaTypes(indicatorId) {
  const rows = await fetchJson(
    `${FINGERTIPS_BASE}/available_data?indicator_id=${indicatorId}`,
  );
  if (!Array.isArray(rows)) {
    throw new PrepareError('available_data did not return an array', { indicatorId });
  }
  return [...new Set(rows.map((r) => r.AreaTypeId))].sort((a, b) => a - b);
}

/**
 * Full indicator metadata. `include_definition=yes` is required — without it the
 * API returns only Name and DataSource, which would silently strip every
 * definition, caveat and standard-population note from the atlas.
 */
export async function fetchIndicatorMetadata(indicatorIds) {
  const metadata = await fetchJson(
    `${FINGERTIPS_BASE}/indicator_metadata/by_indicator_id` +
      `?indicator_ids=${indicatorIds.join(',')}&include_definition=yes`,
  );
  for (const iid of indicatorIds) {
    const entry = metadata[String(iid)];
    if (!entry) throw new PrepareError('Indicator metadata missing', { iid });
    if (!entry.Descriptive || !('Definition' in entry.Descriptive)) {
      throw new PrepareError(
        'Metadata lacks Definition — include_definition flag may no longer be honoured',
        { iid, keys: Object.keys(entry.Descriptive ?? {}) },
      );
    }
  }
  return metadata;
}

export async function fetchAreas(areaTypeId) {
  return fetchJson(`${FINGERTIPS_BASE}/areas/by_area_type?area_type_id=${areaTypeId}`);
}

/**
 * Observations for one indicator at one area type.
 *
 * `profile_id` is mandatory. Omitting it returns a well-formed CSV header with
 * zero data rows — a silent empty result rather than an error — so a header-only
 * response is treated as a hard failure here.
 */
export async function fetchObservations({ indicatorId, childAreaTypeId, profileId }) {
  const url =
    `${FINGERTIPS_BASE}/all_data/csv/by_indicator_id` +
    `?indicator_ids=${indicatorId}` +
    `&child_area_type_id=${childAreaTypeId}` +
    `&parent_area_type_id=${ENGLAND_AREA_TYPE_ID}` +
    `&profile_id=${profileId}`;
  const text = await fetchText(url);
  const { records } = parseCsvWithHeader(
    text,
    REQUIRED_COLUMNS,
    `indicator ${indicatorId} @ area type ${childAreaTypeId}`,
  );
  return { url, records };
}

/**
 * Classifies a Fingertips row into one of four distinct availability states.
 * `0` is a real value and is never conflated with missing or suppressed.
 */
export function classifyValue(record) {
  const raw = (record.Value ?? '').trim();
  const note = (record['Value note'] ?? '').trim();
  const lowerNote = note.toLowerCase();

  const suppressed =
    /suppress|disclos|too small|not published|withheld/.test(lowerNote);

  if (raw === '' || raw === '-') {
    if (suppressed) return { state: 'suppressed', note };
    return { state: 'missing', note: note || null };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { state: 'missing', note: note || `Unparseable value "${raw}"` };
  }
  return { state: 'present', value, note: note || null };
}

function numberOrNull(raw) {
  const s = (raw ?? '').trim();
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Maps the source's England comparison flag onto an explicit vocabulary.
 * Only values the source actually documents are accepted; anything else
 * becomes 'not-compared' rather than being guessed at.
 */
export function classifySignificance(raw) {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === '' || s === 'not compared') return 'not-compared';
  if (s.includes('better')) return 'better';
  if (s.includes('worse')) return 'worse';
  if (s.includes('similar')) return 'similar';
  if (s.includes('higher')) return 'higher';
  if (s.includes('lower')) return 'lower';
  return 'not-compared';
}

export function classifyTrend(raw) {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === '' || s === 'could not be calculated' || s === 'no significant change') {
    return s === '' ? 'not-available' : 'no-significant-change';
  }
  if (s.includes('increasing')) return s.includes('getting worse') ? 'increasing-worse' : 'increasing';
  if (s.includes('decreasing')) return s.includes('getting better') ? 'decreasing-better' : 'decreasing';
  return 'not-available';
}

/** Normalises one CSV row without discarding any source flag. */
export function normaliseObservation(record) {
  const classified = classifyValue(record);
  return {
    areaCode: (record['Area Code'] ?? '').trim(),
    period: (record['Time period'] ?? '').trim(),
    periodSortable: (record['Time period Sortable'] ?? '').trim(),
    periodRange: (record['Time period range'] ?? '').trim() || null,
    sex: (record.Sex ?? '').trim(),
    age: (record.Age ?? '').trim(),
    categoryType: (record['Category Type'] ?? '').trim() || null,
    category: (record.Category ?? '').trim() || null,
    ...classified,
    lowerCi95: numberOrNull(record['Lower CI 95.0 limit']),
    upperCi95: numberOrNull(record['Upper CI 95.0 limit']),
    lowerCi998: numberOrNull(record['Lower CI 99.8 limit']),
    upperCi998: numberOrNull(record['Upper CI 99.8 limit']),
    count: numberOrNull(record.Count),
    denominator: numberOrNull(record.Denominator),
    significance: classifySignificance(record['Compared to England value or percentiles']),
    trend: classifyTrend(record['Recent Trend']),
  };
}

export { REQUIRED_COLUMNS };
