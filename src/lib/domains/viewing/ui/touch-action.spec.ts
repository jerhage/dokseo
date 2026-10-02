import { describe, expect, it } from 'vitest';
import { GESTURE_IDLE, gestureStep } from '$lib/components/gesture';
import type { GestureContext, GestureInput, GestureIntent } from '$lib/components/gesture';
import type { FrameSpan, TouchTurns } from '$lib/shared/page-turn';
import { centreZoneWaits, touchAction, touchLesson } from './touch-action';
import type { PanReach } from '../domain/overscroll';
import type { TouchAction, TouchScene } from './touch-action';

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

  it('hides only the chrome when a side is tapped with the bars up', () => {
    expect(tap(LEFT, WITH_BARS)).toEqual({ kind: 'toggle-chrome' });
    expect(tap(RIGHT, { ...WITH_BARS, direction: 'rtl' })).toEqual({ kind: 'toggle-chrome' });
  });

  it('turns nothing on a tap in the swipe-only variant', () => {
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

  it('leaves a swipe that starts in the edge gutter to the browser in the swipe-only variant', () => {
    expect(swipe(380, 150, SWIPE_ONLY)).toEqual({ kind: 'none' });
  });
});

describe('touchAction gestures that pass through', () => {
  it.each<{ readonly intent: GestureIntent; readonly action: TouchAction }>([
    { intent: { kind: 'pan', dx: 5, dy: -3 }, action: { kind: 'pan', dx: 5, dy: -3 } },
    {
      intent: { kind: 'long-press', x: 10, y: 20 },
      action: { kind: 'select-begin', from: { x: 10, y: 20 }, to: { x: 10, y: 20 } },
    },
    {
      intent: { kind: 'select-begin', from: { x: 1, y: 2 }, to: { x: 3, y: 4 } },
      action: { kind: 'select-begin', from: { x: 1, y: 2 }, to: { x: 3, y: 4 } },
    },
    {
      intent: { kind: 'select-move', x: 5, y: 6 },
      action: { kind: 'select-move', at: { x: 5, y: 6 } },
    },
    {
      intent: { kind: 'select-end', x: 7, y: 8 },
      action: { kind: 'select-end', at: { x: 7, y: 8 } },
    },
    { intent: { kind: 'cancel' }, action: { kind: 'drop' } },
    {
      intent: { kind: 'pinch', scale: 2, cx: 10, cy: 20, dx: 3, dy: 4 },
      action: { kind: 'pinch', scale: 2, cx: 10, cy: 20, dx: 3, dy: 4 },
    },
  ])('answers a $intent.kind with a $action.kind', ({ intent, action }) => {
    expect(touchAction(intent, BARE)).toEqual(action);
  });
});

describe('touchAction double taps', () => {
  it('toggles the zoom at the tapped point', () => {
    expect(touchAction({ kind: 'double-tap', x: CENTRE, y: ROW }, BARE)).toEqual({
      kind: 'zoom-toggle',
      at: { x: CENTRE, y: ROW },
    });
  });

  it('hides only the chrome when the bars are up', () => {
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

  it('teaches the pinch when a pinch zooms', () => {
    const intent = { kind: 'pinch', scale: 1.2, cx: 0, cy: 0, dx: 0, dy: 0 } as const;

    expect(touchLesson(intent, touchAction(intent, BARE))).toBe('pinch');
  });

  it('teaches the double tap when a double tap zooms', () => {
    const intent = { kind: 'double-tap', x: CENTRE, y: ROW } as const;

    expect(touchLesson(intent, touchAction(intent, BARE))).toBe('double-tap');
  });

  it.each<{ readonly intent: GestureIntent; readonly scene: TouchScene }>([
    {
      intent: {
        kind: 'swipe',
        start: { x: CENTRE, y: ROW },
        end: { x: CENTRE, y: ROW + 200 },
        elapsed: 150,
      },
      scene: BARE,
    },
    { intent: { kind: 'double-tap', x: CENTRE, y: ROW }, scene: WITH_BARS },
    { intent: { kind: 'tap', x: CENTRE, y: ROW }, scene: BARE },
  ])(
    'teaches nothing for a $intent.kind that turns no page and zooms nothing',
    ({ intent, scene }) => {
      expect(touchLesson(intent, touchAction(intent, scene))).toBeNull();
    },
  );
});

function pressed(x: number, t: number, kind: 'down' | 'up'): GestureInput {
  return { kind, id: 1, type: 'touch', x, y: ROW, t };
}

function heardThrough(
  inputs: readonly GestureInput[],
  frame: FrameSpan,
  turns: TouchTurns,
): GestureIntent[] {
  const context: GestureContext = {
    pannable: false,
    selectMode: false,
    waitsForDoubleTap: centreZoneWaits(frame, turns),
  };
  let state = GESTURE_IDLE;
  const intents: GestureIntent[] = [];
  for (const input of inputs) {
    const step = gestureStep(state, input, context);
    state = step.state;
    if (step.intent.kind !== 'none') intents.push(step.intent);
  }

  return intents;
}

describe('centreZoneWaits', () => {
  const PHONE: FrameSpan = { left: 0, width: 390 };

  it('taps at once on an edge zone in the tap-zones variant', () => {
    expect(
      heardThrough([pressed(LEFT, 0, 'down'), pressed(LEFT, 90, 'up')], PHONE, 'tap-zones'),
    ).toEqual([{ kind: 'tap', x: LEFT, y: ROW }]);
    expect(
      heardThrough([pressed(RIGHT, 0, 'down'), pressed(RIGHT, 90, 'up')], PHONE, 'tap-zones'),
    ).toEqual([{ kind: 'tap', x: RIGHT, y: ROW }]);
  });

  it('holds a centre tap for the double-tap window', () => {
    expect(
      heardThrough([pressed(CENTRE, 0, 'down'), pressed(CENTRE, 90, 'up')], PHONE, 'tap-zones'),
    ).toEqual([]);
    expect(
      heardThrough(
        [pressed(CENTRE, 0, 'down'), pressed(CENTRE, 90, 'up'), { kind: 'tick', t: 390 }],
        PHONE,
        'tap-zones',
      ),
    ).toEqual([{ kind: 'tap', x: CENTRE, y: ROW }]);
  });

  it('holds an edge tap too in the swipe-only variant, because every tap is a centre tap there', () => {
    expect(
      heardThrough([pressed(LEFT, 0, 'down'), pressed(LEFT, 90, 'up')], PHONE, 'swipe-only'),
    ).toEqual([]);
    expect(
      heardThrough(
        [pressed(LEFT, 0, 'down'), pressed(LEFT, 90, 'up'), { kind: 'tick', t: 400 }],
        PHONE,
        'swipe-only',
      ),
    ).toEqual([{ kind: 'tap', x: LEFT, y: ROW }]);
  });

  it('reads the zone against the frame, not the screen', () => {
    const inset: FrameSpan = { left: 100, width: 200 };

    expect(
      heardThrough([pressed(120, 0, 'down'), pressed(120, 90, 'up')], inset, 'tap-zones'),
    ).toEqual([{ kind: 'tap', x: 120, y: ROW }]);
    expect(
      heardThrough([pressed(200, 0, 'down'), pressed(200, 90, 'up')], inset, 'tap-zones'),
    ).toEqual([]);
  });
});
