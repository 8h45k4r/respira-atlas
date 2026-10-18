import { describe, it, expect } from 'vitest';
import { decodeObservations, DataIntegrityError } from '@/data/validation/decode';
import { isPresent, hasInterval } from '@/data/schemas/observation';

function encoded(overrides: Record<string, unknown> = {}) {
  return {
    encoding: 'columnar-v1',
    rowCount: 4,
    dictionaries: {
      areas: ['E54000008', 'E54000010'],
      periods: ['2023/24', '2024/25'],
      sexes: ['Persons'],
      ages: ['All ages'],
      categoryTypes: [],
      categories: [],
      notes: ['Value suppressed for disclosure control'],
    },
    omittedColumns: [],
    columns: {
      area: [0, 0, 1, 1],
      period: [0, 1, 0, 1],
      sex: [0, 0, 0, 0],
      age: [0, 0, 0, 0],
      // present(0), present(420), suppressed, missing
      state: [0, 0, 2, 1],
      value: [0, 420, null, null],
      lowerCi95: [null, 400, null, null],
      upperCi95: [null, 441, null, null],
      count: [0, 2100, null, null],
      significance: [3, 2, 0, 0],
      note: [-1, -1, 0, -1],
    },
    ...overrides,
  };
}

describe('columnar decoding', () => {
  it('reconstructs every row', () => {
    const rows = decodeObservations(encoded());
    expect(rows).toHaveLength(4);
    expect(rows[0].areaCode).toBe('E54000008');
    expect(rows[0].period).toBe('2023/24');
  });

  it('keeps a value of zero as a present observation', () => {
    const rows = decodeObservations(encoded());
    const zero = rows[0];
    expect(zero.state).toBe('present');
    expect(isPresent(zero) && zero.value).toBe(0);
  });

  it('exposes no value on suppressed or missing rows', () => {
    const rows = decodeObservations(encoded());
    const suppressed = rows[2];
    const missing = rows[3];
    expect(suppressed.state).toBe('suppressed');
    expect(missing.state).toBe('missing');
    expect('value' in suppressed).toBe(false);
    expect('value' in missing).toBe(false);
    expect(isPresent(suppressed)).toBe(false);
  });

  it('preserves the suppression note', () => {
    const rows = decodeObservations(encoded());
    expect(rows[2].note).toMatch(/disclosure control/i);
    expect(rows[3].note).toBeNull();
  });

  it('preserves confidence intervals and the source significance flag', () => {
    const rows = decodeObservations(encoded());
    const row = rows[1];
    expect(hasInterval(row)).toBe(true);
    expect(isPresent(row) && row.lowerCi95).toBe(400);
    expect(row.significance).toBe('worse');
    expect(rows[0].significance).toBe('similar');
  });

  it('treats an omitted column as uniformly null, not as zero', () => {
    const payload = encoded();
    delete (payload.columns as Record<string, unknown>).count;
    const rows = decodeObservations(payload);
    expect(isPresent(rows[1]) && rows[1].count).toBeNull();
  });

  it('rejects a payload whose shape has drifted', () => {
    expect(() => decodeObservations({ encoding: 'something-else' })).toThrow(DataIntegrityError);
    expect(() => decodeObservations(null)).toThrow(DataIntegrityError);
  });

  it('rejects a present row with no finite value', () => {
    const payload = encoded();
    (payload.columns as Record<string, unknown[]>).value = [null, 420, null, null];
    expect(() => decodeObservations(payload)).toThrow(/present but has no finite value/i);
  });

  it('rejects a dangling dictionary reference', () => {
    const payload = encoded();
    (payload.columns as Record<string, number[]>).area = [9, 0, 1, 1];
    expect(() => decodeObservations(payload)).toThrow(/dangling dictionary/i);
  });
});
