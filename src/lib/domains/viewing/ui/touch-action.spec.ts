import { describe, expect, it } from 'vitest';
import { touchAction, touchLesson } from './touch-action';
import type { PanReach } from '../domain/overscroll';
import type { TouchScene } from './touch-action';

const BARE: TouchScene = {
  chromeShown: false,
  turns: 'tap-zones',
  direction: 'ltr',
  frame: { left: 0, width: 390 },
  viewportWidth: 390,
  reach: null,
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

  it('passes a pinch through step by step', () => {
    expect(touchAction({ kind: 'pinch', scale: 2, cx: 10, cy: 20, dx: 3, dy: 4 }, BARE)).toEqual({
      kind: 'pinch',
      scale: 2,
      cx: 10,
      cy: 20,
      dx: 3,
      dy: 4,
    });
  });
});

describe('touchAction double taps', () => {
  it('toggles the zoom at the tapped point', () => {
    expect(touchAction({ kind: 'double-tap', x: CENTRE, y: ROW }, BARE)).toEqual({
      kind: 'zoom-toggle',
      at: { x: CENTRE, y: ROW },
    });
  });

  it('only hides the chrome when the bars are up', () => {
    expect(touchAction({ kind: 'double-tap', x: CENTRE, y: ROW }, WITH_BARS)).toEqual({
      kind: 'toggle-chrome',
    });
  });
});

describe('touchAction pan ends', () => {
  const zoomed: PanReach = {
    origin: { zoom: 2, panX: -390, panY: 0 },
    content: { width: 390, height: 700 },
    frame: { width: 390, height: 700 },
  };

  function panEnd(fromX: number, toX: number, scene: TouchScene) {
    return touchAction(
      { kind: 'pan-end', start: { x: fromX, y: ROW }, end: { x: toX, y: ROW }, elapsed: 200 },
      scene,
    );
  }

  it('turns forward past the right edge of a zoomed page in a left-to-right book', () => {
    expect(panEnd(300, 200, { ...BARE, reach: zoomed })).toEqual({
      kind: 'turn',
      move: 'increment',
    });
  });

  it('turns back past the right edge of a zoomed page in a right-to-left book', () => {
    expect(panEnd(300, 200, { ...MANGA, reach: zoomed })).toEqual({
      kind: 'turn',
      move: 'decrement',
    });
  });

  it('does not turn a pan the page absorbs', () => {
    expect(panEnd(200, 300, { ...BARE, reach: zoomed })).toEqual({ kind: 'none' });
  });

  it('does nothing when the page could not be measured', () => {
    expect(panEnd(300, 200, BARE)).toEqual({ kind: 'none' });
  });
});

describe('touchLesson', () => {
  it('teaches tapping the sides when a tap turns the page', () => {
    const intent = { kind: 'tap', x: LEFT, y: ROW } as const;

    expect(touchLesson(intent, touchAction(intent, BARE))).toBe('tap-sides');
  });

  it('teaches the swipe when a swipe turns the page', () => {
    const intent = {
      kind: 'swipe',
      start: { x: RIGHT, y: ROW },
      end: { x: LEFT, y: ROW },
      elapsed: 150,
    } as const;

    expect(touchLesson(intent, touchAction(intent, BARE))).toBe('swipe');
  });

  it('teaches the swipe when an overscroll turns the page', () => {
    const intent = {
      kind: 'pan-end',
      start: { x: RIGHT, y: ROW },
      end: { x: LEFT, y: ROW },
      elapsed: 150,
    } as const;

    expect(touchLesson(intent, { kind: 'turn', move: 'increment' })).toBe('swipe');
  });

  it('teaches nothing for a swipe that turns no page', () => {
    const intent = {
      kind: 'swipe',
      start: { x: CENTRE, y: ROW },
      end: { x: CENTRE, y: ROW + 200 },
      elapsed: 150,
    } as const;

    expect(touchLesson(intent, touchAction(intent, BARE))).toBeNull();
  });

  it('teaches the pinch when a pinch zooms', () => {
    const intent = { kind: 'pinch', scale: 1.2, cx: 0, cy: 0, dx: 0, dy: 0 } as const;

    expect(touchLesson(intent, touchAction(intent, BARE))).toBe('pinch');
  });

  it('teaches the double tap when a double tap zooms', () => {
    const intent = { kind: 'double-tap', x: CENTRE, y: ROW } as const;

    expect(touchLesson(intent, touchAction(intent, BARE))).toBe('double-tap');
  });

  it('teaches nothing when a double tap only hides the bars', () => {
    const intent = { kind: 'double-tap', x: CENTRE, y: ROW } as const;

    expect(touchLesson(intent, touchAction(intent, WITH_BARS))).toBeNull();
  });

  it('teaches nothing for a centre tap', () => {
    const intent = { kind: 'tap', x: CENTRE, y: ROW } as const;

    expect(touchLesson(intent, touchAction(intent, BARE))).toBeNull();
  });
});
