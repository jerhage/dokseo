import { describe, expect, it } from 'vitest';
import { NO_MATCH } from '../../../domain/capture/match-stepping';
import { searchSteps } from './panel-search';

describe('searchSteps', () => {
  it('counts the matches out of every capture before the first step', () => {
    expect(searchSteps(NO_MATCH, 3, 12)).toEqual({
      tally: '3 of 12 matched',
      previous: false,
      next: true,
    });
  });

  it('names the match the cursor is on, counted from one', () => {
    expect(searchSteps(0, 3, 12).tally).toBe('match 1 of 3');
    expect(searchSteps(2, 3, 12).tally).toBe('match 3 of 3');
  });

  it('allows a previous step only after the first match', () => {
    expect(searchSteps(0, 3, 12).previous).toBe(false);
    expect(searchSteps(1, 3, 12).previous).toBe(true);
  });

  it('allows a next step only before the last match', () => {
    expect(searchSteps(1, 3, 12).next).toBe(true);
    expect(searchSteps(2, 3, 12).next).toBe(false);
    expect(searchSteps(NO_MATCH, 0, 12).next).toBe(false);
  });
});
