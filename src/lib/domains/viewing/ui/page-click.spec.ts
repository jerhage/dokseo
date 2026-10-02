import { describe, expect, it } from 'vitest';
import { pageClick } from './page-click';

const FRAME = { left: 100, width: 1000 };

describe('pageClick', () => {
  it('turns back from the left edge and forward from the right edge of a left to right book', () => {
    expect(pageClick(150, FRAME, 'ltr', true)).toEqual({ kind: 'turn', move: 'decrement' });
    expect(pageClick(1050, FRAME, 'ltr', true)).toEqual({ kind: 'turn', move: 'increment' });
  });

  it('turns forward from the left edge and back from the right edge of a right to left book', () => {
    expect(pageClick(150, FRAME, 'rtl', true)).toEqual({ kind: 'turn', move: 'increment' });
    expect(pageClick(1050, FRAME, 'rtl', true)).toEqual({ kind: 'turn', move: 'decrement' });
  });

  it('toggles the chrome for a click between the edges', () => {
    expect(pageClick(600, FRAME, 'ltr', true)).toEqual({ kind: 'toggle-chrome' });
    expect(pageClick(250, FRAME, 'ltr', true)).toEqual({ kind: 'toggle-chrome' });
    expect(pageClick(950, FRAME, 'rtl', true)).toEqual({ kind: 'toggle-chrome' });
  });

  it('measures the edges from the frame, not from the window', () => {
    expect(pageClick(195, FRAME, 'ltr', true)).toEqual({ kind: 'turn', move: 'decrement' });
    expect(pageClick(205, FRAME, 'ltr', true)).toEqual({ kind: 'toggle-chrome' });
    expect(pageClick(995, FRAME, 'ltr', true)).toEqual({ kind: 'toggle-chrome' });
    expect(pageClick(1005, FRAME, 'ltr', true)).toEqual({ kind: 'turn', move: 'increment' });
  });

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
