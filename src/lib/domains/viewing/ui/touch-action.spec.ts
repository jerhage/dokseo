import { describe, expect, it } from 'vitest';
import { touchAction } from './touch-action';
import type { TouchScene } from './touch-action';

const BARE: TouchScene = {
  chromeShown: false,
  turns: 'tap-zones',
  direction: 'ltr',
  frame: { left: 0, width: 390 },
  viewportWidth: 390,
};

const MANGA: TouchScene = { ...BARE, direction: 'rtl' };

const SWIPE_ONLY: TouchScene = { ...BARE, turns: 'swipe-only' };

const WITH_BARS: TouchScene = { ...BARE, chromeShown: true };

const ROW = 400;

const LEFT = 40;

const CENTRE = 195;

const RIGHT = 350;

function tap(x: number, scene: TouchScene) {
  return touchAction({ kind: 'tap', x, y: ROW }, scene);
}

function swipe(fromX: number, toX: number, scene: TouchScene) {
  return touchAction(
    { kind: 'swipe', start: { x: fromX, y: ROW }, end: { x: toX, y: ROW }, elapsed: 150 },
    scene,
  );
}

describe('touchAction taps', () => {
  it('turns back on a left tap and forward on a right tap in a left-to-right book', () => {
    expect(tap(LEFT, BARE)).toEqual({ kind: 'turn', move: 'decrement' });
    expect(tap(RIGHT, BARE)).toEqual({ kind: 'turn', move: 'increment' });
  });

  it('mirrors the side taps in a right-to-left book', () => {
    expect(tap(LEFT, MANGA)).toEqual({ kind: 'turn', move: 'increment' });
    expect(tap(RIGHT, MANGA)).toEqual({ kind: 'turn', move: 'decrement' });
  });

  it('toggles the chrome on a centre tap', () => {
    expect(tap(CENTRE, BARE)).toEqual({ kind: 'toggle-chrome' });
  });

  it('only hides the chrome when a side is tapped with the bars up', () => {
    expect(tap(LEFT, WITH_BARS)).toEqual({ kind: 'toggle-chrome' });
    expect(tap(RIGHT, { ...WITH_BARS, direction: 'rtl' })).toEqual({ kind: 'toggle-chrome' });
  });

  it('never turns on a tap in the swipe-only variant', () => {
    expect([tap(LEFT, SWIPE_ONLY), tap(CENTRE, SWIPE_ONLY), tap(RIGHT, SWIPE_ONLY)]).toEqual([
      { kind: 'toggle-chrome' },
      { kind: 'toggle-chrome' },
      { kind: 'toggle-chrome' },
    ]);
  });

  it('reads the zone against the frame, not the screen', () => {
    const offset: TouchScene = { ...BARE, frame: { left: 300, width: 390 }, viewportWidth: 1000 };

    expect(tap(300 + CENTRE, offset)).toEqual({ kind: 'toggle-chrome' });
    expect(tap(300 + RIGHT, offset)).toEqual({ kind: 'turn', move: 'increment' });
  });
});

describe('touchAction swipes', () => {
  it('turns forward on a leftward swipe in a left-to-right book', () => {
    expect(swipe(300, 100, BARE)).toEqual({ kind: 'turn', move: 'increment' });
  });

  it('turns forward on a rightward swipe in a right-to-left book', () => {
    expect(swipe(100, 300, MANGA)).toEqual({ kind: 'turn', move: 'increment' });
  });

  it('turns on a swipe in the swipe-only variant as well', () => {
    expect(swipe(300, 100, SWIPE_ONLY)).toEqual({ kind: 'turn', move: 'increment' });
  });

  it('leaves a swipe that starts in the edge gutter to the browser in the swipe-only variant', () => {
    expect(swipe(380, 150, SWIPE_ONLY)).toEqual({ kind: 'none' });
  });

  it('does nothing for a swipe too short to count', () => {
    expect(swipe(200, 190, BARE)).toEqual({ kind: 'none' });
  });
});

describe('touchAction gestures that pass through', () => {
  it('pans by the step the classifier reported', () => {
    expect(touchAction({ kind: 'pan', dx: 5, dy: -3 }, BARE)).toEqual({
      kind: 'pan',
      dx: 5,
      dy: -3,
    });
  });

  it('begins a selection at the held point on a long press', () => {
    expect(touchAction({ kind: 'long-press', x: 10, y: 20 }, BARE)).toEqual({
      kind: 'select-begin',
      from: { x: 10, y: 20 },
      to: { x: 10, y: 20 },
    });
  });

  it('follows and ends a selection', () => {
    expect(
      touchAction({ kind: 'select-begin', from: { x: 1, y: 2 }, to: { x: 3, y: 4 } }, BARE),
    ).toEqual({ kind: 'select-begin', from: { x: 1, y: 2 }, to: { x: 3, y: 4 } });
    expect(touchAction({ kind: 'select-move', x: 5, y: 6 }, BARE)).toEqual({
      kind: 'select-move',
      at: { x: 5, y: 6 },
    });
    expect(touchAction({ kind: 'select-end', x: 7, y: 8 }, BARE)).toEqual({
      kind: 'select-end',
      at: { x: 7, y: 8 },
    });
  });

  it('drops a live gesture on a cancel', () => {
    expect(touchAction({ kind: 'cancel' }, BARE)).toEqual({ kind: 'drop' });
  });

  it('does nothing yet for a pinch, a double tap or the end of a pan', () => {
    expect([
      touchAction({ kind: 'pinch', scale: 2, cx: 0, cy: 0, dx: 0, dy: 0 }, BARE),
      touchAction({ kind: 'double-tap', x: CENTRE, y: ROW }, BARE),
      touchAction(
        { kind: 'pan-end', start: { x: 0, y: 0 }, end: { x: 300, y: 0 }, elapsed: 100 },
        BARE,
      ),
    ]).toEqual([{ kind: 'none' }, { kind: 'none' }, { kind: 'none' }]);
  });
});
