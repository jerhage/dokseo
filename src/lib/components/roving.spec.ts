import { describe, expect, it } from 'vitest';
import { landOn, menuMove, tabMove } from './roving';

const ALL = [true, true, true, true];

const SECOND_OFF = [true, false, true, true];

describe('tabMove', () => {
  it('maps the horizontal arrows, Home and End', () => {
    expect(['ArrowRight', 'ArrowLeft', 'Home', 'End'].map(tabMove)).toEqual([
      'next',
      'previous',
      'first',
      'last',
    ]);
  });

  it('ignores the vertical arrows', () => {
    expect([tabMove('ArrowDown'), tabMove('ArrowUp')]).toEqual([undefined, undefined]);
  });

  it('ignores a key named after an object property', () => {
    expect(tabMove('toString')).toBeUndefined();
  });
});

describe('menuMove', () => {
  it('maps the vertical arrows, Home and End', () => {
    expect(['ArrowDown', 'ArrowUp', 'Home', 'End'].map(menuMove)).toEqual([
      'next',
      'previous',
      'first',
      'last',
    ]);
  });

  it('ignores the horizontal arrows', () => {
    expect([menuMove('ArrowRight'), menuMove('ArrowLeft')]).toEqual([undefined, undefined]);
  });
});

describe('landOn', () => {
  it('steps to the next item', () => {
    expect(landOn('next', 1, ALL)).toBe(2);
  });

  it('steps to the previous item', () => {
    expect(landOn('previous', 2, ALL)).toBe(1);
  });

  it('wraps from the last item to the first', () => {
    expect(landOn('next', 3, ALL)).toBe(0);
  });

  it('wraps from the first item to the last', () => {
    expect(landOn('previous', 0, ALL)).toBe(3);
  });

  it('skips a disabled item going forward', () => {
    expect(landOn('next', 0, SECOND_OFF)).toBe(2);
  });

  it('skips a disabled item going back', () => {
    expect(landOn('previous', 2, SECOND_OFF)).toBe(0);
  });

  it('jumps to the first and the last enabled item', () => {
    const edges = [false, true, true, false];

    expect([landOn('first', 2, edges), landOn('last', 1, edges)]).toEqual([1, 2]);
  });

  it('enters at the first item when nothing is focused yet', () => {
    expect(landOn('next', -1, ALL)).toBe(0);
  });

  it('enters at the last item going back when nothing is focused yet', () => {
    expect(landOn('previous', -1, ALL)).toBe(3);
  });

  it('lands nowhere when every item is disabled', () => {
    expect(landOn('next', 0, [false, false])).toBeUndefined();
  });
});
