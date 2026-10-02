import { describe, expect, it } from 'vitest';
import { pageClick } from './page-click';

const FRAME = { left: 100, width: 1000 };

describe('pageClick', () => {
  it('turns forward from the left edge and back from the right edge of a right to left book', () => {
    expect(pageClick(150, FRAME, 'rtl', true)).toEqual({ kind: 'turn', move: 'increment' });
    expect(pageClick(1050, FRAME, 'rtl', true)).toEqual({ kind: 'turn', move: 'decrement' });
  });

  it.each([
    { x: 150, direction: 'ltr', click: { kind: 'turn', move: 'decrement' } },
    { x: 195, direction: 'ltr', click: { kind: 'turn', move: 'decrement' } },
    { x: 205, direction: 'ltr', click: { kind: 'toggle-chrome' } },
    { x: 250, direction: 'ltr', click: { kind: 'toggle-chrome' } },
    { x: 600, direction: 'ltr', click: { kind: 'toggle-chrome' } },
    { x: 950, direction: 'rtl', click: { kind: 'toggle-chrome' } },
    { x: 995, direction: 'ltr', click: { kind: 'toggle-chrome' } },
    { x: 1005, direction: 'ltr', click: { kind: 'turn', move: 'increment' } },
    { x: 1050, direction: 'ltr', click: { kind: 'turn', move: 'increment' } },
  ] as const)(
    'measures the edges from the frame, not from the window, at $x in a $direction book',
    ({ x, direction, click }) => {
      expect(pageClick(x, FRAME, direction, true)).toEqual(click);
    },
  );

  it('toggles the chrome for a click on either edge when edge clicks do not turn', () => {
    expect(pageClick(150, FRAME, 'ltr', false)).toEqual({ kind: 'toggle-chrome' });
    expect(pageClick(1050, FRAME, 'ltr', false)).toEqual({ kind: 'toggle-chrome' });
    expect(pageClick(150, FRAME, 'rtl', false)).toEqual({ kind: 'toggle-chrome' });
    expect(pageClick(1050, FRAME, 'rtl', false)).toEqual({ kind: 'toggle-chrome' });
    expect(pageClick(600, FRAME, 'ltr', false)).toEqual({ kind: 'toggle-chrome' });
  });

  it('toggles the chrome when the frame has no width', () => {
    expect(pageClick(0, { left: 0, width: 0 }, 'ltr', true)).toEqual({ kind: 'toggle-chrome' });
    expect(pageClick(Number.NaN, FRAME, 'ltr', true)).toEqual({ kind: 'toggle-chrome' });
  });
});
