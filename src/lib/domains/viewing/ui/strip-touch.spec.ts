import { describe, expect, it } from 'vitest';
import { GESTURE_IDLE, LONG_PRESS_MS, gestureStep } from '$lib/components/gesture';
import type { GestureContext, GestureInput, GestureState } from '$lib/components/gesture';
import { holdsTheScroll, stripTouchAction } from './strip-touch';

const STRIP: GestureContext = {
  pannable: false,
  selectMode: false,
  doubleTaps: false,
  waitsForDoubleTap: () => false,
};

const ROW = 400;

const FINGER = 1;

const THUMB = 2;

function touch(kind: 'down' | 'move' | 'up', x: number, t: number, id = FINGER): GestureInput {
  return { kind, id, type: 'touch', x, y: ROW, t };
}

function settled(inputs: readonly GestureInput[], context: GestureContext = STRIP): GestureState {
  let state = GESTURE_IDLE;
  for (const input of inputs) state = gestureStep(state, input, context).state;

  return state;
}

function actions(inputs: readonly GestureInput[], context: GestureContext = STRIP) {
  let state = GESTURE_IDLE;
  const seen = [];
  for (const input of inputs) {
    const step = gestureStep(state, input, context);
    state = step.state;
    const action = stripTouchAction(step.intent);
    if (action.kind !== 'none') seen.push(action);
  }

  return seen;
}

describe('stripTouchAction', () => {
  it('toggles the chrome on a tap wherever it lands, since the strip has no side zones', () => {
    expect(stripTouchAction({ kind: 'tap', x: 4, y: ROW })).toEqual({ kind: 'toggle-chrome' });
    expect(stripTouchAction({ kind: 'tap', x: 195, y: ROW })).toEqual({ kind: 'toggle-chrome' });
    expect(stripTouchAction({ kind: 'tap', x: 386, y: ROW })).toEqual({ kind: 'toggle-chrome' });
  });

  it('leaves a pan and a swipe to the browser, so nothing turns sideways', () => {
    const start = { x: 300, y: ROW };
    const end = { x: 60, y: ROW };

    expect(stripTouchAction({ kind: 'pan', dx: -240, dy: 0 })).toEqual({ kind: 'none' });
    expect(stripTouchAction({ kind: 'swipe', start, end, elapsed: 120 })).toEqual({
      kind: 'none',
    });
    expect(stripTouchAction({ kind: 'pan-end', start, end, elapsed: 120 })).toEqual({
      kind: 'none',
    });
  });

  it('zooms by the pinch, carrying the point under the old midpoint to the new one', () => {
    expect(
      stripTouchAction({ kind: 'pinch', scale: 1.5, cx: 200, cy: 300, dx: 10, dy: -20 }),
    ).toEqual({ kind: 'zoom', scale: 1.5, from: { x: 190, y: 320 }, to: { x: 200, y: 300 } });
  });

  it('begins a selection where a long press landed', () => {
    expect(stripTouchAction({ kind: 'long-press', x: 120, y: ROW })).toEqual({
      kind: 'select-begin',
      from: { x: 120, y: ROW },
      to: { x: 120, y: ROW },
    });
  });

  it('drops a live selection on a cancel', () => {
    expect(stripTouchAction({ kind: 'cancel' })).toEqual({ kind: 'drop' });
  });
});

describe('the strip through the classifier', () => {
  it('toggles the chrome at the release of a tap, without a double-tap wait', () => {
    expect(actions([touch('down', 195, 0), touch('up', 195, 80)])).toEqual([
      { kind: 'toggle-chrome' },
    ]);
  });

  it('captures after a long press and a drag', () => {
    expect(
      actions([
        touch('down', 100, 0),
        { kind: 'tick', t: LONG_PRESS_MS },
        touch('move', 180, LONG_PRESS_MS + 50),
        touch('up', 200, LONG_PRESS_MS + 90),
      ]),
    ).toEqual([
      { kind: 'select-begin', from: { x: 100, y: ROW }, to: { x: 100, y: ROW } },
      { kind: 'select-move', at: { x: 180, y: ROW } },
      { kind: 'select-end', at: { x: 200, y: ROW } },
    ]);
  });

  it('draws at once in select mode', () => {
    expect(
      actions([touch('down', 100, 0), touch('move', 180, 40)], { ...STRIP, selectMode: true }),
    ).toEqual([{ kind: 'select-begin', from: { x: 100, y: ROW }, to: { x: 180, y: ROW } }]);
  });

  it('selects nothing when the finger moves before the long press, which is a scroll', () => {
    expect(
      actions([
        touch('down', 100, 0),
        touch('move', 100 + 40, 100),
        { kind: 'tick', t: LONG_PRESS_MS },
        touch('up', 100 + 40, LONG_PRESS_MS + 50),
      ]),
    ).toEqual([]);
  });
});

describe('holdsTheScroll', () => {
  it('lets the browser scroll a press, a scroll and an empty strip', () => {
    expect(holdsTheScroll(GESTURE_IDLE, 0)).toBe(false);
    expect(holdsTheScroll(settled([touch('down', 100, 0)]), 1)).toBe(false);
    expect(holdsTheScroll(settled([touch('down', 100, 0), touch('move', 160, 40)]), 1)).toBe(false);
  });

  it('holds the scroll once a long press has begun a selection', () => {
    expect(
      holdsTheScroll(settled([touch('down', 100, 0), { kind: 'tick', t: LONG_PRESS_MS }]), 1),
    ).toBe(true);
  });

  it('holds the scroll for a select-mode drag', () => {
    const state = settled([touch('down', 100, 0), touch('move', 160, 40)], {
      ...STRIP,
      selectMode: true,
    });

    expect(holdsTheScroll(state, 1)).toBe(true);
  });

  it('holds the scroll through a pinch and until its last finger lifts', () => {
    const pinching = [touch('down', 100, 0), touch('down', 200, 10, THUMB)];

    expect(holdsTheScroll(settled(pinching), 2)).toBe(true);
    expect(holdsTheScroll(settled([...pinching, touch('up', 200, 90, THUMB)]), 1)).toBe(true);
  });

  it('holds the scroll whenever two fingers are down, whatever the classifier saw', () => {
    expect(holdsTheScroll(GESTURE_IDLE, 2)).toBe(true);
  });
});
