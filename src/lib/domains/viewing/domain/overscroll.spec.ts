import { describe, expect, it } from 'vitest';
import type { Size } from '$lib/shared/geometry';
import { overscrollTurn } from './overscroll';
import type { PanReach, TurnArea } from './overscroll';

const FRAME: Size = { width: 390, height: 700 };

const CONTENT: Size = { width: 390, height: 700 };

const ZOOM = 2;

const RIGHT_EDGE = FRAME.width - CONTENT.width * ZOOM;

const TAP_ZONES: TurnArea = {
  span: { left: 0, width: FRAME.width },
  viewportWidth: FRAME.width,
  turns: 'tap-zones',
};

const SWIPE_ONLY: TurnArea = { ...TAP_ZONES, turns: 'swipe-only' };

const ROW = 350;

function reachAt(panX: number): PanReach {
  return { origin: { zoom: ZOOM, panX, panY: -350 }, content: CONTENT, frame: FRAME };
}

function drag(reach: PanReach, fromX: number, toX: number, area = TAP_ZONES, dy = 0) {
  return overscrollTurn(
    reach,
    { start: { x: fromX, y: ROW }, end: { x: toX, y: ROW + dy }, elapsed: 200 },
    area,
  );
}

describe('overscrollTurn', () => {
  it('turns on a leftward swipe that starts with the page at its right edge', () => {
    expect(drag(reachAt(RIGHT_EDGE), 300, 200)).toBe('right');
  });

  it('turns on a rightward swipe that starts with the page at its left edge', () => {
    expect(drag(reachAt(0), 100, 200)).toBe('left');
  });

  it('does not turn a pan that the page absorbs mid-way', () => {
    expect(drag(reachAt(RIGHT_EDGE / 2), 300, 200)).toBeNull();
  });

  it('does not turn a drag towards the edge the page is not at', () => {
    expect(drag(reachAt(RIGHT_EDGE), 100, 200)).toBeNull();
  });

  it('turns when the pan reaches the edge and the travel past it is a swipe', () => {
    expect(drag(reachAt(RIGHT_EDGE + 40), 300, 200)).toBe('right');
  });

  it('does not turn when the travel past the edge is too short to be a swipe', () => {
    expect(drag(reachAt(RIGHT_EDGE + 80), 300, 200)).toBeNull();
  });

  it('turns a horizontal swipe on a page that only pans vertically', () => {
    const tall: PanReach = { ...reachAt(0), origin: { zoom: 1, panX: 0, panY: -100 } };
    const upright: PanReach = { ...tall, content: { width: 390, height: 900 } };

    expect(drag(upright, 300, 200)).toBe('right');
  });

  it('never turns a vertical pan, even at the edge', () => {
    expect(drag(reachAt(RIGHT_EDGE), 300, 180, TAP_ZONES, 200)).toBeNull();
  });

  it('leaves a swipe that starts in the edge gutter to the browser in the swipe-only variant', () => {
    expect(drag(reachAt(RIGHT_EDGE), 380, 250, SWIPE_ONLY)).toBeNull();
    expect(drag(reachAt(RIGHT_EDGE), 300, 200, SWIPE_ONLY)).toBe('right');
  });

  it('does nothing for a non-finite stroke', () => {
    expect(drag(reachAt(RIGHT_EDGE), Number.NaN, 200)).toBeNull();
  });
});
