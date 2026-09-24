import { describe, expect, it } from 'vitest';
import { landOn, menuMove, tabMove, textDirection } from './roving';

const ALL = [true, true, true, true];

const SECOND_OFF = [true, false, true, true];

const TAB_KEYS = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];

describe('tabMove', () => {
  it('maps the horizontal arrows, Home and End left to right', () => {
    expect(TAB_KEYS.map((key) => tabMove(key, 'ltr'))).toEqual([
      'next',
      'previous',
      'first',
      'last',
    ]);
  });

  it('swaps the horizontal arrows right to left and keeps Home and End', () => {
    expect(TAB_KEYS.map((key) => tabMove(key, 'rtl'))).toEqual([
      'previous',
      'next',
      'first',
      'last',
    ]);
  });

  it('ignores the vertical arrows in either direction', () => {
    expect([
      tabMove('ArrowDown', 'ltr'),
      tabMove('ArrowUp', 'ltr'),
      tabMove('ArrowDown', 'rtl'),
      tabMove('ArrowUp', 'rtl'),
    ]).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('ignores a key named after an object property', () => {
    expect([tabMove('toString', 'ltr'), tabMove('toString', 'rtl')]).toEqual([
      undefined,
      undefined,
    ]);
  });
});

describe('textDirection', () => {
  it('reads a computed rtl as right to left', () => {
    expect(textDirection('rtl')).toBe('rtl');
  });

  it('reads ltr, an empty value and anything unknown as left to right', () => {
    expect([textDirection('ltr'), textDirection(''), textDirection('auto')]).toEqual([
      'ltr',
      'ltr',
      'ltr',
    ]);
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
