import { describe, expect, it } from 'vitest';
import {
  DOUBLE_TAP_MS,
  DOUBLE_TAP_SLOP_PX,
  GESTURE_IDLE,
  LONG_PRESS_MS,
  TOUCH_SLOP_PX,
  gestureDeadline,
  gestureStep,
} from './gesture';
import type {
  GestureContext,
  GestureInput,
  GestureIntent,
  GestureSample,
  GestureState,
  Point,
} from './gesture';

function inMiddleThird(at: Point): boolean {
  return at.x >= 117 && at.x <= 273;
}

const FIT: GestureContext = {
  pannable: false,
  selectMode: false,
  waitsForDoubleTap: inMiddleThird,
};

const ZOOMED: GestureContext = { ...FIT, pannable: true };

const SELECTING: GestureContext = { ...FIT, selectMode: true };

const WAITS_EVERYWHERE: GestureContext = { ...FIT, waitsForDoubleTap: () => true };

const CENTRE = 195;

const LEFT_EDGE = 40;

const RIGHT_EDGE = 350;

const ROW = 400;

const FINGER = 1;

const THUMB = 2;

function sample(
  kind: GestureSample['kind'],
  x: number,
  t: number,
  id = FINGER,
  y = ROW,
): GestureSample {
  return { kind, id, type: 'touch', x, y, t };
}

function down(x: number, t: number, id = FINGER, y = ROW): GestureSample {
  return sample('down', x, t, id, y);
}

function move(x: number, t: number, id = FINGER, y = ROW): GestureSample {
  return sample('move', x, t, id, y);
}

function up(x: number, t: number, id = FINGER, y = ROW): GestureSample {
  return sample('up', x, t, id, y);
}

function cancel(t: number, id = FINGER): GestureSample {
  return sample('cancel', 0, t, id);
}

function tick(t: number): GestureInput {
  return { kind: 'tick', t };
}

function run(inputs: readonly GestureInput[], context: GestureContext = FIT): GestureIntent[] {
  let state = GESTURE_IDLE;
  const intents: GestureIntent[] = [];
  for (const input of inputs) {
    const step = gestureStep(state, input, context);
    state = step.state;
    intents.push(step.intent);
  }

  return intents;
}

function heard(inputs: readonly GestureInput[], context: GestureContext = FIT): GestureIntent[] {
  return run(inputs, context).filter((intent) => intent.kind !== 'none');
}

describe('gestureStep taps', () => {
  it('taps at once where the caller waits for no double tap', () => {
    expect(run([down(LEFT_EDGE, 0), up(LEFT_EDGE, 90)])).toEqual([
      { kind: 'none' },
      { kind: 'tap', x: LEFT_EDGE, y: ROW },
    ]);
    expect(heard([down(RIGHT_EDGE, 0), up(RIGHT_EDGE, 90)])).toEqual([
      { kind: 'tap', x: RIGHT_EDGE, y: ROW },
    ]);
  });

  it('holds a centre tap for the double-tap window, then taps on a tick', () => {
    const released = 90;

    expect(
      run([
        down(CENTRE, 0),
        up(CENTRE, released),
        tick(released + DOUBLE_TAP_MS - 1),
        tick(released + DOUBLE_TAP_MS),
      ]),
    ).toEqual([
      { kind: 'none' },
      { kind: 'none' },
      { kind: 'none' },
      { kind: 'tap', x: CENTRE, y: ROW },
    ]);
  });

  it('taps once only, however many ticks follow', () => {
    expect(heard([down(CENTRE, 0), up(CENTRE, 90), tick(500), tick(600), tick(700)])).toEqual([
      { kind: 'tap', x: CENTRE, y: ROW },
    ]);
  });

  it('holds an edge tap too when the caller waits for a double tap everywhere', () => {
    expect(run([down(LEFT_EDGE, 0), up(LEFT_EDGE, 90)], WAITS_EVERYWHERE)).toEqual([
      { kind: 'none' },
      { kind: 'none' },
    ]);
    expect(heard([down(LEFT_EDGE, 0), up(LEFT_EDGE, 90), tick(400)], WAITS_EVERYWHERE)).toEqual([
      { kind: 'tap', x: LEFT_EDGE, y: ROW },
    ]);
  });

  it('asks the caller about the point where the finger lifted', () => {
    const asked: Point[] = [];
    const listening: GestureContext = {
      ...FIT,
      waitsForDoubleTap: (at) => {
        asked.push(at);
        return false;
      },
    };

    expect(heard([down(120, 0), move(126, 40), up(128, 90)], listening)).toEqual([
      { kind: 'tap', x: 128, y: ROW },
    ]);
    expect(asked).toEqual([{ x: 128, y: ROW }]);
  });

  it('forgives a finger that drifts eleven pixels', () => {
    expect(
      heard([
        down(LEFT_EDGE, 0),
        move(LEFT_EDGE + 6, 30),
        move(LEFT_EDGE + 11, 60),
        up(LEFT_EDGE + 11, 90),
      ]),
    ).toEqual([{ kind: 'tap', x: LEFT_EDGE + 11, y: ROW }]);
  });

  it('refuses a tap once the finger has strayed twelve pixels, even if it comes back', () => {
    expect(
      heard([down(LEFT_EDGE, 0), move(LEFT_EDGE + 12, 30), move(LEFT_EDGE, 60), up(LEFT_EDGE, 90)]),
    ).toEqual([
      {
        kind: 'swipe',
        start: { x: LEFT_EDGE, y: ROW },
        end: { x: LEFT_EDGE, y: ROW },
        elapsed: 90,
      },
    ]);
  });

  it('refuses a tap whose release alone lands past the slop', () => {
    expect(heard([down(LEFT_EDGE, 0), up(LEFT_EDGE + 30, 90)])).toEqual([
      {
        kind: 'swipe',
        start: { x: LEFT_EDGE, y: ROW },
        end: { x: LEFT_EDGE + 30, y: ROW },
        elapsed: 90,
      },
    ]);
  });

  it('refuses a tap held past the long press when no tick arrived', () => {
    expect(heard([down(LEFT_EDGE, 0), up(LEFT_EDGE, LONG_PRESS_MS)])).toEqual([]);
  });
});

describe('gestureStep double taps', () => {
  it('reports two quick centre taps as one double tap and no single tap', () => {
    expect(
      heard([
        down(CENTRE, 0),
        up(CENTRE, 60),
        down(CENTRE + 10, 200),
        up(CENTRE + 10, 260),
        tick(900),
      ]),
    ).toEqual([{ kind: 'double-tap', x: CENTRE + 10, y: ROW }]);
  });

  it('takes the second press as a double tap however long it is held, short of a long press', () => {
    expect(
      heard([down(CENTRE, 0), up(CENTRE, 60), down(CENTRE, 200), tick(560), up(CENTRE, 560)]),
    ).toEqual([{ kind: 'double-tap', x: CENTRE, y: ROW }]);
  });

  it('taps the first press when the second lands too far away, and holds the second', () => {
    expect(
      run([
        down(CENTRE, 0),
        up(CENTRE, 60),
        down(CENTRE + 60, 200),
        up(CENTRE + 60, 260),
        tick(560),
      ]),
    ).toEqual([
      { kind: 'none' },
      { kind: 'none' },
      { kind: 'tap', x: CENTRE, y: ROW },
      { kind: 'none' },
      { kind: 'tap', x: CENTRE + 60, y: ROW },
    ]);
  });

  it('taps the first press when the second lands after the window', () => {
    expect(
      run([down(CENTRE, 0), up(CENTRE, 60), down(CENTRE, 60 + DOUBLE_TAP_MS), up(CENTRE, 420)]),
    ).toEqual([
      { kind: 'none' },
      { kind: 'none' },
      { kind: 'tap', x: CENTRE, y: ROW },
      { kind: 'none' },
    ]);
  });

  it('never delays a tap the caller does not hold, so two edge taps are two taps', () => {
    expect(
      heard([down(RIGHT_EDGE, 0), up(RIGHT_EDGE, 60), down(RIGHT_EDGE, 120), up(RIGHT_EDGE, 180)]),
    ).toEqual([
      { kind: 'tap', x: RIGHT_EDGE, y: ROW },
      { kind: 'tap', x: RIGHT_EDGE, y: ROW },
    ]);
  });

  it('taps the held press first when the second press starts to drag, then pans on', () => {
    expect(
      heard(
        [
          down(CENTRE, 0),
          up(CENTRE, 60),
          down(CENTRE, 120),
          move(CENTRE + 20, 150),
          move(CENTRE + 30, 170),
        ],
        ZOOMED,
      ),
    ).toEqual([
      { kind: 'tap', x: CENTRE, y: ROW },
      { kind: 'pan', dx: 30, dy: 0 },
    ]);
  });

  it('never long-presses a second press that strayed while the held tap was being sent', () => {
    expect(
      heard([
        down(CENTRE, 0),
        up(CENTRE, 60),
        down(CENTRE, 120),
        move(CENTRE + 20, 150),
        tick(120 + LONG_PRESS_MS),
        move(CENTRE + 40, 540),
        up(CENTRE + 60, 600),
      ]),
    ).toEqual([
      { kind: 'tap', x: CENTRE, y: ROW },
      {
        kind: 'swipe',
        start: { x: CENTRE, y: ROW },
        end: { x: CENTRE + 60, y: ROW },
        elapsed: 480,
      },
    ]);
  });

  it('taps the held press first when the second press becomes a long press', () => {
    expect(
      heard([
        down(CENTRE, 0),
        up(CENTRE, 60),
        down(CENTRE, 120),
        tick(120 + LONG_PRESS_MS),
        tick(540),
      ]),
    ).toEqual([
      { kind: 'tap', x: CENTRE, y: ROW },
      { kind: 'long-press', x: CENTRE, y: ROW },
    ]);
  });
});

describe('gestureStep long presses', () => {
  it('begins a selection after a still hold, then follows and ends it', () => {
    expect(
      run([
        down(CENTRE, 0),
        tick(LONG_PRESS_MS - 1),
        tick(LONG_PRESS_MS),
        move(CENTRE + 80, 500, FINGER, ROW + 60),
        up(CENTRE + 90, 600, FINGER, ROW + 70),
      ]),
    ).toEqual([
      { kind: 'none' },
      { kind: 'none' },
      { kind: 'long-press', x: CENTRE, y: ROW },
      { kind: 'select-move', x: CENTRE + 80, y: ROW + 60 },
      { kind: 'select-end', x: CENTRE + 90, y: ROW + 70 },
    ]);
  });

  it('notices a long press on a still move when the tick was missed', () => {
    expect(heard([down(CENTRE, 0), move(CENTRE + 4, LONG_PRESS_MS)])).toEqual([
      { kind: 'long-press', x: CENTRE, y: ROW },
    ]);
  });

  it('begins a selection on a long press even when the page can pan', () => {
    expect(heard([down(CENTRE, 0), tick(LONG_PRESS_MS)], ZOOMED)).toEqual([
      { kind: 'long-press', x: CENTRE, y: ROW },
    ]);
  });

  it('keeps a long-press selection when a second finger lands', () => {
    expect(
      heard([
        down(CENTRE, 0),
        tick(LONG_PRESS_MS),
        down(100, 450, THUMB),
        move(120, 460, THUMB),
        move(CENTRE + 40, 470),
        up(120, 480, THUMB),
        up(CENTRE + 40, 490),
      ]),
    ).toEqual([
      { kind: 'long-press', x: CENTRE, y: ROW },
      { kind: 'select-move', x: CENTRE + 40, y: ROW },
      { kind: 'select-end', x: CENTRE + 40, y: ROW },
    ]);
  });
});

describe('gestureStep select mode', () => {
  it('selects at once when one finger drags, anchored where it landed', () => {
    expect(
      run(
        [
          down(100, 0),
          move(130, 30, FINGER, ROW + 20),
          move(200, 60, FINGER, ROW + 90),
          up(210, 90, FINGER, ROW + 100),
        ],
        SELECTING,
      ),
    ).toEqual([
      { kind: 'none' },
      { kind: 'select-begin', from: { x: 100, y: ROW }, to: { x: 130, y: ROW + 20 } },
      { kind: 'select-move', x: 200, y: ROW + 90 },
      { kind: 'select-end', x: 210, y: ROW + 100 },
    ]);
  });

  it('selects rather than pans in select mode, even on a pannable page', () => {
    expect(heard([down(100, 0), move(130, 30)], { ...SELECTING, pannable: true })).toEqual([
      { kind: 'select-begin', from: { x: 100, y: ROW }, to: { x: 130, y: ROW } },
    ]);
  });

  it('still taps in select mode', () => {
    expect(heard([down(LEFT_EDGE, 0), up(LEFT_EDGE, 60)], SELECTING)).toEqual([
      { kind: 'tap', x: LEFT_EDGE, y: ROW },
    ]);
  });

  it('pinches when a second finger lands before the first has dragged', () => {
    expect(
      heard([down(100, 0), down(200, 20, THUMB), move(300, 40, THUMB)], SELECTING).map(
        (intent) => intent.kind,
      ),
    ).toEqual(['pinch']);
  });

  it('never turns a live selection into a pinch', () => {
    expect(
      heard(
        [down(100, 0), move(130, 30), down(300, 40, THUMB), move(320, 50, THUMB), move(140, 60)],
        SELECTING,
      ).map((intent) => intent.kind),
    ).toEqual(['select-begin', 'select-move']);
  });
});

describe('gestureStep pans', () => {
  it('pans one finger on a pannable page, first from where it landed and then by each step', () => {
    expect(
      run(
        [down(100, 0, FINGER, 300), move(120, 20, FINGER, 310), move(125, 30, FINGER, 290)],
        ZOOMED,
      ),
    ).toEqual([{ kind: 'none' }, { kind: 'pan', dx: 20, dy: 10 }, { kind: 'pan', dx: 5, dy: -20 }]);
  });

  it('holds still inside the slop, so a tap never nudges the page', () => {
    expect(heard([down(100, 0), move(108, 20)], ZOOMED)).toEqual([]);
  });

  it('ends a pan with where it began and ended, for the overscroll turn', () => {
    expect(heard([down(100, 0), move(160, 40), up(170, 80)], ZOOMED)).toEqual([
      { kind: 'pan', dx: 60, dy: 0 },
      { kind: 'pan-end', start: { x: 100, y: ROW }, end: { x: 170, y: ROW }, elapsed: 80 },
    ]);
  });

  it('keeps the plan made at the press when the page becomes pannable mid-gesture', () => {
    let state = GESTURE_IDLE;
    const intents: GestureIntent[] = [];
    const steps: readonly [GestureInput, GestureContext][] = [
      [down(300, 0), FIT],
      [move(200, 40), ZOOMED],
      [up(150, 80), ZOOMED],
    ];
    for (const [input, context] of steps) {
      const step = gestureStep(state, input, context);
      state = step.state;
      intents.push(step.intent);
    }

    expect(intents.map((intent) => intent.kind)).toEqual(['none', 'none', 'swipe']);
  });
});

describe('gestureStep swipes', () => {
  it('reports a swipe with its start, end and duration when the page cannot pan', () => {
    expect(run([down(300, 0), move(250, 30), move(180, 60), up(160, 90)])).toEqual([
      { kind: 'none' },
      { kind: 'none' },
      { kind: 'none' },
      { kind: 'swipe', start: { x: 300, y: ROW }, end: { x: 160, y: ROW }, elapsed: 90 },
    ]);
  });

  it('never begins a long press during a swipe', () => {
    expect(heard([down(300, 0), move(250, 30), tick(900)])).toEqual([]);
  });
});

describe('gestureStep pinches', () => {
  it('reports the scale, the midpoint and how far the midpoint moved', () => {
    expect(heard([down(100, 0), down(200, 10, THUMB), move(300, 30, THUMB)])).toEqual([
      { kind: 'pinch', scale: 2, cx: 200, cy: ROW, dx: 50, dy: 0 },
    ]);
  });

  it('reports each step against the one before it', () => {
    expect(heard([down(100, 0), down(200, 10, THUMB), move(300, 30, THUMB), move(0, 40)])).toEqual([
      { kind: 'pinch', scale: 2, cx: 200, cy: ROW, dx: 50, dy: 0 },
      { kind: 'pinch', scale: 1.5, cx: 150, cy: ROW, dx: -50, dy: 0 },
    ]);
  });

  it('turns a pan into a pinch when a second finger lands', () => {
    expect(
      heard([down(100, 0), move(120, 10), down(220, 20, THUMB), move(320, 30, THUMB)], ZOOMED),
    ).toEqual([
      { kind: 'pan', dx: 20, dy: 0 },
      { kind: 'pinch', scale: 2, cx: 220, cy: ROW, dx: 50, dy: 0 },
    ]);
  });

  it('turns a swipe into a pinch when a second finger lands', () => {
    expect(
      heard([
        down(100, 0),
        move(120, 10),
        down(220, 20, THUMB),
        move(320, 30, THUMB),
        up(120, 40),
        up(320, 50, THUMB),
      ]),
    ).toEqual([{ kind: 'pinch', scale: 2, cx: 220, cy: ROW, dx: 50, dy: 0 }]);
  });

  it('taps a held centre tap before the pinch begins', () => {
    expect(
      heard([down(CENTRE, 0), up(CENTRE, 60), down(CENTRE, 100), down(300, 110, THUMB)]),
    ).toEqual([{ kind: 'tap', x: CENTRE, y: ROW }]);
  });

  it('ignores a third finger', () => {
    expect(
      heard([
        down(100, 0),
        down(200, 10, THUMB),
        down(300, 20, 3),
        move(400, 30, 3),
        up(400, 40, 3),
      ]),
    ).toEqual([]);
  });

  it('ignores the finger left behind after a pinch until it lifts, then taps again', () => {
    expect(
      heard([
        down(100, 0),
        down(200, 10, THUMB),
        up(200, 30, THUMB),
        move(160, 40),
        down(LEFT_EDGE, 45, 3),
        up(LEFT_EDGE, 50, 3),
        up(160, 60),
        down(LEFT_EDGE, 100),
        up(LEFT_EDGE, 150),
      ]),
    ).toEqual([{ kind: 'tap', x: LEFT_EDGE, y: ROW }]);
  });
});

describe('gestureStep cancels', () => {
  it('cancels a live pan and ignores the finger afterwards', () => {
    expect(
      heard([down(100, 0), move(140, 20), cancel(30), move(200, 40), up(200, 50)], ZOOMED),
    ).toEqual([{ kind: 'pan', dx: 40, dy: 0 }, { kind: 'cancel' }]);
  });

  it('cancels a live selection', () => {
    expect(heard([down(CENTRE, 0), tick(LONG_PRESS_MS), cancel(450), up(CENTRE, 500)])).toEqual([
      { kind: 'long-press', x: CENTRE, y: ROW },
      { kind: 'cancel' },
    ]);
  });

  it('cancels a pinch and ignores the finger left behind', () => {
    expect(
      heard([down(100, 0), down(200, 10, THUMB), cancel(20, THUMB), move(50, 30), up(50, 40)]),
    ).toEqual([{ kind: 'cancel' }]);
  });

  it('drops a press and the tap it was holding, quietly', () => {
    expect(
      heard([down(CENTRE, 0), up(CENTRE, 60), down(CENTRE, 100), cancel(120), tick(900)]),
    ).toEqual([]);
  });

  it('drops a swipe without reporting it', () => {
    expect(heard([down(300, 0), move(200, 20), cancel(30), up(150, 40)])).toEqual([]);
  });

  it('ignores a cancel from a pointer it is not following', () => {
    expect(heard([down(LEFT_EDGE, 0), cancel(20, THUMB), up(LEFT_EDGE, 40)])).toEqual([
      { kind: 'tap', x: LEFT_EDGE, y: ROW },
    ]);
  });
});

describe('gestureStep pointer types', () => {
  it('ignores a mouse and a pen entirely, leaving them their own paths', () => {
    for (const type of ['mouse', 'pen']) {
      const inputs: GestureInput[] = [
        { kind: 'down', id: FINGER, type, x: LEFT_EDGE, y: ROW, t: 0 },
        { kind: 'move', id: FINGER, type, x: 200, y: ROW, t: 20 },
        { kind: 'up', id: FINGER, type, x: 200, y: ROW, t: 40 },
      ];

      expect(heard(inputs, ZOOMED)).toEqual([]);
    }
  });
});

function settled(inputs: readonly GestureInput[], context: GestureContext = FIT): GestureState {
  let state = GESTURE_IDLE;
  for (const input of inputs) state = gestureStep(state, input, context).state;

  return state;
}

describe('gesture constants', () => {
  it('holds a long press at 400 ms and a double tap at 300 ms', () => {
    expect(LONG_PRESS_MS).toBe(400);
    expect(DOUBLE_TAP_MS).toBe(300);
  });

  it('forgives 12 pixels of drift and 40 pixels between the taps of a double tap', () => {
    expect(TOUCH_SLOP_PX).toBe(12);
    expect(DOUBLE_TAP_SLOP_PX).toBe(40);
  });
});

describe('gestureDeadline', () => {
  it('asks for no tick while nothing is pending', () => {
    expect(gestureDeadline(GESTURE_IDLE)).toBeNull();
  });

  it('asks for a tick when a held press would become a long press', () => {
    expect(gestureDeadline(settled([down(CENTRE, 100)]))).toBe(100 + LONG_PRESS_MS);
  });

  it('asks for a tick when a held centre tap runs out of its double-tap window', () => {
    expect(gestureDeadline(settled([down(CENTRE, 100), up(CENTRE, 150)]))).toBe(
      150 + DOUBLE_TAP_MS,
    );
  });

  it('asks for no tick once a press has become a pan, a swipe or a selection', () => {
    expect(gestureDeadline(settled([down(100, 0), move(200, 30)], ZOOMED))).toBeNull();
    expect(gestureDeadline(settled([down(100, 0), move(200, 30)]))).toBeNull();
    expect(gestureDeadline(settled([down(100, 0), move(200, 30)], SELECTING))).toBeNull();
  });

  it('never asks for a tick that lands before the moment the reducer acts on', () => {
    const state = settled([down(CENTRE, 0)]);
    const deadline = gestureDeadline(state) ?? Number.NaN;

    expect(gestureStep(state, tick(deadline - 1), FIT).intent.kind).toBe('none');
    expect(gestureStep(state, tick(deadline), FIT).intent.kind).toBe('long-press');
  });
});
