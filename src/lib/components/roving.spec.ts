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

  it.each([
    ['ArrowDown', 'ltr'],
    ['ArrowUp', 'ltr'],
    ['ArrowDown', 'rtl'],
    ['ArrowUp', 'rtl'],
    ['toString', 'ltr'],
    ['toString', 'rtl'],
  ] as const)('ignores %s in %s text', (key, direction) => {
    expect(tabMove(key, direction)).toBeUndefined();
  });
});

describe('textDirection', () => {
  it.each([
    ['rtl', 'rtl'],
    ['ltr', 'ltr'],
    ['', 'ltr'],
    ['auto', 'ltr'],
  ])('reads a computed %j as %s', (computed, direction) => {
    expect(textDirection(computed)).toBe(direction);
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
  it.each([
    ['steps to the next item', 'next', 1, ALL, 2],
    ['steps to the previous item', 'previous', 2, ALL, 1],
    ['wraps from the last item to the first', 'next', 3, ALL, 0],
    ['wraps from the first item to the last', 'previous', 0, ALL, 3],
    ['skips a disabled item going forward', 'next', 0, SECOND_OFF, 2],
    ['skips a disabled item going back', 'previous', 2, SECOND_OFF, 0],
    ['enters at the first item when nothing is focused yet', 'next', -1, ALL, 0],
    ['enters at the last item going back when nothing is focused yet', 'previous', -1, ALL, 3],
  ] as const)('%s', (_name, move, from, enabled, landed) => {
    expect(landOn(move, from, enabled)).toBe(landed);
  });

  it('jumps to the first and the last enabled item', () => {
    const edges = [false, true, true, false];

    expect([landOn('first', 2, edges), landOn('last', 1, edges)]).toEqual([1, 2]);
  });

  it('lands nowhere when every item is disabled', () => {
    expect(landOn('next', 0, [false, false])).toBeUndefined();
  });
});
