import { describe, it, expect } from 'vitest';
import {
  serialiseState, deserialiseState, DEFAULT_STATE, MAX_COMPARISON_AREAS,
  type AtlasState,
} from '@/state/atlas-state';

describe('URL state round trip', () => {
  const full: AtlasState = {
    mode: 'explain',
    topic: 'cardiovascular',
    geographyMode: 'nhs',
    areaTypeKey: 'icb22',
    indicatorId: 93577,
    sex: 'Female',
    period: '2024/25',
    periodSeries: '1y',
    selectedAreaCode: 'E54000008',
    comparisonAreaCodes: ['E54000010', 'E54000011'],
    classification: 'equal-interval',
    classCount: 7,
    lockScale: true,
    nationFocus: 'England',
    scatterIndicatorId: 93867,
    comparePeriod: '2023/24',
    subgroupCategoryType: 'Sex',
  };

  it('round trips every field', () => {
    const restored = deserialiseState(serialiseState(full));
    expect(restored).toEqual(full);
  });

  it('round trips the defaults', () => {
    // A bare query carries no analytical state, so it opens on discovery.
    expect(deserialiseState(serialiseState(DEFAULT_STATE)))
      .toEqual({ ...DEFAULT_STATE, mode: 'discover' });
  });

  it('opens discovery for a bare URL but the workspace for an analytical one', () => {
    expect(deserialiseState('').mode).toBe('discover');
    expect(deserialiseState('a=E06000065').mode).toBe('explore');
    expect(deserialiseState('i=93577').mode).toBe('explore');
    expect(deserialiseState('t=cancer').mode).toBe('explore');
    // An explicit mode always wins.
    expect(deserialiseState('v=methods').mode).toBe('methods');
    expect(deserialiseState('v=explore').mode).toBe('explore');
  });

  it('keeps default values out of the query string', () => {
    const query = serialiseState(DEFAULT_STATE);
    expect(query).toBe('');
  });

  it('is stable across repeated round trips', () => {
    const once = deserialiseState(serialiseState(full));
    const twice = deserialiseState(serialiseState(once));
    expect(twice).toEqual(once);
  });
});

describe('URL state is defensive about bad input', () => {
  it('falls back to defaults on an unknown mode', () => {
    // An unrecognised mode falls back the same way a missing one does: to
    // discovery when the URL has no analytical state, to the workspace when it does.
    expect(deserialiseState('v=nonsense').mode).toBe('discover');
    expect(deserialiseState('v=nonsense&i=93577').mode).toBe('explore');
    expect(deserialiseState('g=moon').geographyMode).toBe(DEFAULT_STATE.geographyMode);
    expect(deserialiseState('cm=rainbow').classification).toBe(DEFAULT_STATE.classification);
  });

  it('rejects a non-numeric indicator id rather than inventing one', () => {
    expect(deserialiseState('i=abc').indicatorId).toBeNull();
    expect(deserialiseState('i=').indicatorId).toBeNull();
  });

  it('rejects area codes that are not ONS codes', () => {
    expect(deserialiseState('a=Birmingham').selectedAreaCode).toBeNull();
    expect(deserialiseState('a=E5400000').selectedAreaCode).toBeNull();
    expect(deserialiseState('a=E54000008').selectedAreaCode).toBe('E54000008');
  });

  it('filters invalid codes out of the comparison list', () => {
    const state = deserialiseState('c=E54000008,notacode,E54000010');
    expect(state.comparisonAreaCodes).toEqual(['E54000008', 'E54000010']);
  });

  it('caps the comparison list', () => {
    const codes = ['E54000001', 'E54000002', 'E54000003', 'E54000004', 'E54000005', 'E54000006'];
    const state = deserialiseState(`c=${codes.join(',')}`);
    expect(state.comparisonAreaCodes).toHaveLength(MAX_COMPARISON_AREAS);
  });

  it('de-duplicates the comparison list', () => {
    const state = deserialiseState('c=E54000008,E54000008,E54000010');
    expect(state.comparisonAreaCodes).toEqual(['E54000008', 'E54000010']);
  });

  it('clamps the class count to a renderable range', () => {
    expect(deserialiseState('cn=1').classCount).toBe(DEFAULT_STATE.classCount);
    expect(deserialiseState('cn=99').classCount).toBe(DEFAULT_STATE.classCount);
    expect(deserialiseState('cn=7').classCount).toBe(7);
  });

  it('treats an empty query as the default state, on discovery', () => {
    expect(deserialiseState('')).toEqual({ ...DEFAULT_STATE, mode: 'discover' });
  });
});
