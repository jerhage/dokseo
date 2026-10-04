import { describe, expect, it } from 'vitest';
import { gestureReading, swipeCheck } from './gesture-reading';
import type { SwipeArea } from './gesture-reading';

const area: SwipeArea = { width: 400, turns: 'tap-zones' };

describe('gestureReading', () => {
  it('measures a tap from its press to its release', () => {
    const reading = gestureReading(
      { kind: 'tap', x: 103, y: 104 },
      { at: { x: 100, y: 100 }, t: 1000 },
      { at: { x: 103, y: 104 }, t: 1080 },
      area,
    );

    expect(reading).toEqual({ kind: 'tap', distance: 5, duration: 80, speed: 5 / 80, swipe: null });
  });

  it('measures a long press as held still from the press to the tick', () => {
    const reading = gestureReading(
      { kind: 'long-press', x: 100, y: 100 },
      { at: { x: 100, y: 100 }, t: 1000 },
      { at: { x: 100, y: 100 }, t: 1400 },
      area,
    );

    expect(reading?.distance).toBe(0);
    expect(reading?.duration).toBe(400);
  });

  it('reads a swipe from the stroke the classifier reports', () => {
    const reading = gestureReading(
      { kind: 'swipe', start: { x: 300, y: 100 }, end: { x: 200, y: 110 }, elapsed: 200 },
      null,
      { at: { x: 200, y: 110 }, t: 0 },
      area,
    );

    expect(reading?.duration).toBe(200);
    expect(reading?.swipe?.turn).toBe('right');
  });

  it('reports nothing for an intent in the middle of a gesture', () => {
    expect(
      gestureReading({ kind: 'pan', dx: 4, dy: 0 }, null, { at: { x: 0, y: 0 }, t: 0 }, area),
    ).toBeNull();
  });
});

describe('swipeCheck', () => {
  it('passes a short stroke by speed when it is fast enough', () => {
    const check = swipeCheck(
      { start: { x: 200, y: 50 }, end: { x: 230, y: 50 }, elapsed: 50 },
      area,
    );

    expect(check.fling).toBe('speed');
    expect(check.turn).toBe('left');
  });

  it('turns nothing for a slow short stroke', () => {
    const check = swipeCheck(
      { start: { x: 200, y: 50 }, end: { x: 230, y: 50 }, elapsed: 500 },
      area,
    );

    expect(check.fling).toBe('neither');
    expect(check.turn).toBeNull();
  });

  it('turns nothing for a stroke more vertical than the axis ratio allows', () => {
    const check = swipeCheck(
      { start: { x: 200, y: 50 }, end: { x: 280, y: 110 }, elapsed: 100 },
      area,
    );

    expect(check.sideways).toBe(false);
    expect(check.turn).toBeNull();
  });

  it('turns nothing for a swipe from the edge gutter in swipe only', () => {
    const check = swipeCheck(
      { start: { x: 10, y: 50 }, end: { x: 200, y: 50 }, elapsed: 100 },
      { width: 400, turns: 'swipe-only' },
    );

    expect(check.fling).toBe('distance');
    expect(check.turn).toBeNull();
  });
});
