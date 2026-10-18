import { describe, it, expect } from 'vitest';
import { classify, classOf, DEFAULT_CLASSIFICATION } from '@/data/selectors/classification';
import { present, nonPresent } from './fixtures';

describe('map classification', () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const observations = values.map((v, i) =>
    present(v, { areaCode: `E5400000${i}` }),
  );

  it('defaults to a documented, reproducible method', () => {
    expect(DEFAULT_CLASSIFICATION).toBe('quantile');
  });

  it('produces the requested number of classes with explicit boundaries', () => {
    const result = classify(observations, { method: 'quantile', classCount: 5 });
    expect(result).not.toBeNull();
    expect(result!.classCount).toBe(5);
    expect(result!.boundaries).toHaveLength(4);
    expect(result!.min).toBe(10);
    expect(result!.max).toBe(100);
    expect(result!.methodLabel).toMatch(/quantile/i);
  });

  it('assigns every value to exactly one class', () => {
    const result = classify(observations, { classCount: 5 })!;
    for (const value of values) {
      const index = classOf(result, value);
      expect(index).not.toBeNull();
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(result.classCount);
    }
    const total = result.breaks.reduce((n, b) => n + b.count, 0);
    expect(total).toBe(values.length);
  });

  it('equal interval produces evenly spaced boundaries', () => {
    const result = classify(observations, { method: 'equal-interval', classCount: 3 })!;
    const gaps = result.boundaries.map((b, i, arr) =>
      i === 0 ? b - result.min : b - arr[i - 1],
    );
    for (const gap of gaps) expect(gap).toBeCloseTo(30, 5);
  });

  it('excludes missing and suppressed observations from the scale', () => {
    const withGaps = [
      ...observations,
      nonPresent('missing', { areaCode: 'E54000090' }),
      nonPresent('suppressed', { areaCode: 'E54000091' }),
    ];
    const result = classify(withGaps, { classCount: 5 })!;
    expect(result.classifiedCount).toBe(values.length);
    expect(result.breaks.reduce((n, b) => n + b.count, 0)).toBe(values.length);
  });

  it('returns null when nothing has a value', () => {
    expect(classify([nonPresent('missing'), nonPresent('suppressed')])).toBeNull();
    expect(classify([])).toBeNull();
  });

  it('honours fixed boundaries and records that the scale is external', () => {
    const result = classify(observations, { fixedBoundaries: [25, 50, 75] })!;
    expect(result.method).toBe('fixed');
    expect(result.boundaries).toEqual([25, 50, 75]);
    expect(result.scaleSource).toBe('fixed-reference');
    expect(result.scaleNote).toBeTruthy();
  });

  it('collapses to a single class when every value is identical', () => {
    const flat = [1, 2, 3].map((i) => present(42, { areaCode: `E540000${i}` }));
    const result = classify(flat, { classCount: 5 })!;
    expect(result.classCount).toBe(1);
    expect(result.scaleNote).toMatch(/same value/i);
  });

  it('never creates more classes than there are distinct values', () => {
    const few = [5, 5, 9, 9].map((v, i) => present(v, { areaCode: `E54000${i}0` }));
    const result = classify(few, { classCount: 7 })!;
    expect(result.classCount).toBeLessThanOrEqual(2);
  });
});
