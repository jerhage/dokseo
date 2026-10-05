import { describe, expect, it } from 'vitest';
import { hiddenNames, overflowLine } from './overflow-list';

const NAMES = ['tag 0', 'tag 1', 'tag 2', 'tag 3', 'tag 4'];

describe('overflowLine', () => {
  it('shows every item that fits the room', () => {
    expect(overflowLine(NAMES.slice(0, 3), 3)).toEqual({ shown: NAMES.slice(0, 3), hidden: [] });
  });

  it('gives the last place to a count of the rest once the items overflow', () => {
    const line = overflowLine(NAMES, 3);

    expect(line.shown).toEqual(['tag 0', 'tag 1']);
    expect(line.hidden).toEqual(['tag 2', 'tag 3', 'tag 4']);
  });

  it('hides two items rather than one when a single item overflows the room', () => {
    expect(overflowLine(NAMES.slice(0, 4), 3)).toEqual({
      shown: ['tag 0', 'tag 1'],
      hidden: ['tag 2', 'tag 3'],
    });
  });

  it('shows nothing but the count when the room holds only the count', () => {
    expect(overflowLine(NAMES.slice(0, 2), 1)).toEqual({ shown: [], hidden: ['tag 0', 'tag 1'] });
  });

  it('shows nothing and hides nothing for no items', () => {
    expect(overflowLine([], 3)).toEqual({ shown: [], hidden: [] });
  });
});

describe('hiddenNames', () => {
  it('joins the names of the hidden items with commas', () => {
    expect(hiddenNames(['gamma', 'delta'], (name) => name.toUpperCase())).toBe('GAMMA, DELTA');
  });

  it('names nothing when nothing is hidden', () => {
    expect(hiddenNames([], (name: string) => name)).toBe('');
  });
});
