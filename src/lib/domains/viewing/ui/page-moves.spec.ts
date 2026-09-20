import { describe, expect, it } from 'vitest';
import { moveOrder } from './page-moves';

describe('moveOrder', () => {
  it('puts the incrementing move first in a right-to-left book, because advancing moves leftward', () => {
    expect(moveOrder('paged', 'rtl')).toEqual(['increment', 'decrement']);
  });

  it('puts the decrementing move first in a left-to-right book', () => {
    expect(moveOrder('paged', 'ltr')).toEqual(['decrement', 'increment']);
  });

  it('turns a right-to-left book the other way round from a left-to-right one', () => {
    expect(moveOrder('paged', 'rtl')).toEqual(moveOrder('paged', 'ltr').toReversed());
  });

  it('puts the decrementing move first in a strip, because it reads downward', () => {
    expect(moveOrder('continuous', 'ltr')).toEqual(['decrement', 'increment']);
  });

  it('orders a strip one way whatever direction it carries', () => {
    expect(moveOrder('continuous', 'rtl')).toEqual(moveOrder('continuous', 'ltr'));
  });

  it('offers each move exactly once', () => {
    expect(new Set(moveOrder('paged', 'rtl')).size).toBe(2);
  });
});
