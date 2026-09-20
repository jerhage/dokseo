import { describe, expect, it } from 'vitest';
import { clampedIndex, matchOfTotal, NO_MATCH, wrappedIndex } from './match-stepping';

describe('clampedIndex', () => {
  it('selects the first row when nothing is selected and the step is forward', () => {
    expect(clampedIndex(NO_MATCH, 1, 4)).toBe(0);
  });

  it('selects the last row when nothing is selected and the step is backward', () => {
    expect(clampedIndex(NO_MATCH, -1, 4)).toBe(3);
  });

  it('stops at the last row rather than passing it', () => {
    expect(clampedIndex(3, 1, 4)).toBe(3);
  });

  it('stops at the first row rather than passing it', () => {
    expect(clampedIndex(0, -1, 4)).toBe(0);
  });

  it('reports no match when there is nothing to step through', () => {
    expect(clampedIndex(0, 1, 0)).toBe(NO_MATCH);
  });
});

describe('wrappedIndex', () => {
  it('returns to the first match after the last one', () => {
    expect(wrappedIndex(2, 1, 3)).toBe(0);
  });

  it('returns to the last match before the first one', () => {
    expect(wrappedIndex(0, -1, 3)).toBe(2);
  });

  it('steps forward inside the run', () => {
    expect(wrappedIndex(0, 1, 3)).toBe(1);
  });

  it('starts from the first match when nothing is selected', () => {
    expect(wrappedIndex(NO_MATCH, 1, 3)).toBe(1);
  });

  it('reports no match when there is nothing to step through', () => {
    expect(wrappedIndex(0, 1, 0)).toBe(NO_MATCH);
  });
});

describe('matchOfTotal', () => {
  it('counts from one', () => {
    expect(matchOfTotal(0, 3)).toBe('match 1 of 3');
  });

  it('says there is no match when the run is empty', () => {
    expect(matchOfTotal(NO_MATCH, 0)).toBe('no match');
  });
});
