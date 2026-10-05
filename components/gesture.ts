import { match } from 'ts-pattern';

type Point = { readonly x: number; readonly y: number };

type GestureSample = {
  readonly kind: 'down' | 'move' | 'up' | 'cancel';
  readonly id: number;
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly t: number;
};

type GestureTick = { readonly kind: 'tick'; readonly t: number };

type GestureInput = GestureSample | GestureTick;

type GestureContext = {
  readonly pannable: boolean;
  readonly selectMode: boolean;
  readonly waitsForDoubleTap: (at: Point) => boolean;
};

type GestureIntent =
  | { readonly kind: 'none' }
  | { readonly kind: 'tap'; readonly x: number; readonly y: number }
  | { readonly kind: 'double-tap'; readonly x: number; readonly y: number }
  | { readonly kind: 'long-press'; readonly x: number; readonly y: number }
  | { readonly kind: 'pan'; readonly dx: number; readonly dy: number }
  | {
      readonly kind: 'pan-end';
      readonly start: Point;
      readonly end: Point;
      readonly elapsed: number;
    }
  | {
      readonly kind: 'pinch';
      readonly scale: number;
      readonly cx: number;
      readonly cy: number;
      readonly dx: number;
      readonly dy: number;
    }
  | { readonly kind: 'swipe'; readonly start: Point; readonly end: Point; readonly elapsed: number }
  | { readonly kind: 'select-begin'; readonly from: Point; readonly to: Point }
  | { readonly kind: 'select-move'; readonly x: number; readonly y: number }
  | { readonly kind: 'select-end'; readonly x: number; readonly y: number }
  | { readonly kind: 'cancel' };

type Plan = 'select' | 'pan' | 'swipe';

type Press = {
  readonly id: number;
  readonly plan: Plan;
  readonly start: Point;
  readonly startedAt: number;
  readonly at: Point;
  readonly strayed: boolean;
};

type Contact = { readonly id: number; readonly at: Point };

type PendingTap = { readonly at: Point; readonly t: number };

type GestureState =
  | { readonly kind: 'idle'; readonly pending: PendingTap | null }
  | { readonly kind: 'pressed'; readonly press: Press; readonly pending: PendingTap | null }
  | { readonly kind: 'panning'; readonly press: Press }
  | { readonly kind: 'swiping'; readonly press: Press }
  | { readonly kind: 'selecting'; readonly id: number }
  | { readonly kind: 'pinching'; readonly first: Contact; readonly second: Contact }
  | { readonly kind: 'lifting'; readonly ids: readonly number[] };

type GestureStep = { readonly state: GestureState; readonly intent: GestureIntent };

const LONG_PRESS_MS = 400;

const DOUBLE_TAP_MS = 300;

const DOUBLE_TAP_SLOP_PX = 40;

const TOUCH_SLOP_PX = 12;

const GESTURE_IDLE: GestureState = { kind: 'idle', pending: null };

const NONE: GestureIntent = { kind: 'none' };

const CANCEL: GestureIntent = { kind: 'cancel' };

function pointOf(sample: GestureSample): Point {
  return { x: sample.x, y: sample.y };
}

function stayedPut(from: Point, to: Point): boolean {
  return Math.abs(to.x - from.x) < TOUCH_SLOP_PX && Math.abs(to.y - from.y) < TOUCH_SLOP_PX;
}

function tapAt(at: Point): GestureIntent {
  return { kind: 'tap', x: at.x, y: at.y };
}

function still(state: GestureState): GestureStep {
  return { state, intent: NONE };
}

function isStale(pending: PendingTap, at: Point, t: number): boolean {
  return (
    t - pending.t >= DOUBLE_TAP_MS ||
    Math.hypot(at.x - pending.at.x, at.y - pending.at.y) > DOUBLE_TAP_SLOP_PX
  );
}

function planFor(context: GestureContext): Plan {
  if (context.selectMode) return 'select';
  return context.pannable ? 'pan' : 'swipe';
}

function isLongPress(press: Press, t: number): boolean {
  return !press.strayed && t - press.startedAt >= LONG_PRESS_MS;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pinchBetween(first: Contact, second: Contact, moved: Contact): GestureStep {
  const nextFirst = moved.id === first.id ? moved : first;
  const nextSecond = moved.id === second.id ? moved : second;
  const before = distance(first.at, second.at);
  const after = distance(nextFirst.at, nextSecond.at);
  const was = midpoint(first.at, second.at);
  const now = midpoint(nextFirst.at, nextSecond.at);

  return {
    state: { kind: 'pinching', first: nextFirst, second: nextSecond },
    intent: {
      kind: 'pinch',
      scale: before > 0 && after > 0 ? after / before : 1,
      cx: now.x,
      cy: now.y,
      dx: now.x - was.x,
      dy: now.y - was.y,
    },
  };
}

function beginPinch(press: Press, sample: GestureSample): GestureState {
  return {
    kind: 'pinching',
    first: { id: press.id, at: press.at },
    second: { id: sample.id, at: pointOf(sample) },
  };
}

function lifted(ids: readonly number[], id: number): GestureState {
  const left = ids.filter((held) => held !== id);
  return left.length === 0 ? GESTURE_IDLE : { kind: 'lifting', ids: left };
}

function pressDown(
  pending: PendingTap | null,
  sample: GestureSample,
  context: GestureContext,
): GestureStep {
  const at = pointOf(sample);
  const stale = pending !== null && isStale(pending, at, sample.t);
  const press: Press = {
    id: sample.id,
    plan: planFor(context),
    start: at,
    startedAt: sample.t,
    at,
    strayed: false,
  };

  return {
    state: { kind: 'pressed', press, pending: stale ? null : pending },
    intent: pending !== null && stale ? tapAt(pending.at) : NONE,
  };
}

function strayedAway(press: Press): GestureStep {
  return match<Plan, GestureStep>(press.plan)
    .with('select', () => ({
      state: { kind: 'selecting', id: press.id },
      intent: { kind: 'select-begin', from: press.start, to: press.at },
    }))
    .with('pan', () => ({
      state: { kind: 'panning', press },
      intent: {
        kind: 'pan',
        dx: press.at.x - press.start.x,
        dy: press.at.y - press.start.y,
      },
    }))
    .with('swipe', () => ({ state: { kind: 'swiping', press }, intent: NONE }))
    .exhaustive();
}

function movePressed(press: Press, pending: PendingTap | null, sample: GestureSample): GestureStep {
  const at = pointOf(sample);
  const moved: Press = { ...press, at, strayed: press.strayed || !stayedPut(press.start, at) };

  if (pending !== null && (moved.strayed || isLongPress(moved, sample.t))) {
    return { state: { kind: 'pressed', press: moved, pending: null }, intent: tapAt(pending.at) };
  }
  if (moved.strayed) return strayedAway(moved);
  if (isLongPress(moved, sample.t)) {
    return {
      state: { kind: 'selecting', id: moved.id },
      intent: { kind: 'long-press', x: moved.start.x, y: moved.start.y },
    };
  }

  return still({ kind: 'pressed', press: moved, pending });
}

function releasePressed(
  press: Press,
  pending: PendingTap | null,
  sample: GestureSample,
  context: GestureContext,
): GestureStep {
  const at = pointOf(sample);
  const elapsed = sample.t - press.startedAt;
  const strayed = press.strayed || !stayedPut(press.start, at);

  if (pending !== null && (strayed || elapsed >= LONG_PRESS_MS)) {
    return { state: GESTURE_IDLE, intent: tapAt(pending.at) };
  }
  if (strayed) {
    return match<Plan, GestureStep>(press.plan)
      .with('select', () => still(GESTURE_IDLE))
      .with('pan', () => ({
        state: GESTURE_IDLE,
        intent: { kind: 'pan-end', start: press.start, end: at, elapsed },
      }))
      .with('swipe', () => ({
        state: GESTURE_IDLE,
        intent: { kind: 'swipe', start: press.start, end: at, elapsed },
      }))
      .exhaustive();
  }
  if (elapsed >= LONG_PRESS_MS) return still(GESTURE_IDLE);
  if (pending !== null) return { state: GESTURE_IDLE, intent: { kind: 'double-tap', ...at } };
  if (!context.waitsForDoubleTap(at)) {
    return { state: GESTURE_IDLE, intent: tapAt(at) };
  }

  return still({ kind: 'idle', pending: { at, t: sample.t } });
}

function down(state: GestureState, sample: GestureSample, context: GestureContext): GestureStep {
  return match<GestureState, GestureStep>(state)
    .with({ kind: 'idle' }, (idle) => pressDown(idle.pending, sample, context))
    .with({ kind: 'pressed' }, ({ press, pending }) => {
      if (press.id === sample.id) return still(state);

      return {
        state: beginPinch(press, sample),
        intent: pending === null ? NONE : tapAt(pending.at),
      };
    })
    .with({ kind: 'panning' }, { kind: 'swiping' }, ({ press }) =>
      press.id === sample.id ? still(state) : still(beginPinch(press, sample)),
    )
    .with({ kind: 'selecting' }, { kind: 'pinching' }, () => still(state))
    .with({ kind: 'lifting' }, ({ ids }) =>
      still({ kind: 'lifting', ids: ids.includes(sample.id) ? ids : [...ids, sample.id] }),
    )
    .exhaustive();
}

function move(state: GestureState, sample: GestureSample): GestureStep {
  return match<GestureState, GestureStep>(state)
    .with({ kind: 'idle' }, { kind: 'lifting' }, () => still(state))
    .with({ kind: 'pressed' }, ({ press, pending }) =>
      press.id === sample.id ? movePressed(press, pending, sample) : still(state),
    )
    .with({ kind: 'panning' }, ({ press }) => {
      if (press.id !== sample.id) return still(state);

      const at = pointOf(sample);
      return {
        state: { kind: 'panning', press: { ...press, at } },
        intent: { kind: 'pan', dx: at.x - press.at.x, dy: at.y - press.at.y },
      };
    })
    .with({ kind: 'swiping' }, ({ press }) =>
      press.id === sample.id
        ? still({ kind: 'swiping', press: { ...press, at: pointOf(sample) } })
        : still(state),
    )
    .with({ kind: 'selecting' }, ({ id }) =>
      id === sample.id
        ? { state, intent: { kind: 'select-move', x: sample.x, y: sample.y } }
        : still(state),
    )
    .with({ kind: 'pinching' }, ({ first, second }) =>
      sample.id === first.id || sample.id === second.id
        ? pinchBetween(first, second, { id: sample.id, at: pointOf(sample) })
        : still(state),
    )
    .exhaustive();
}

function up(state: GestureState, sample: GestureSample, context: GestureContext): GestureStep {
  return match<GestureState, GestureStep>(state)
    .with({ kind: 'idle' }, () => still(state))
    .with({ kind: 'pressed' }, ({ press, pending }) =>
      press.id === sample.id ? releasePressed(press, pending, sample, context) : still(state),
    )
    .with({ kind: 'panning' }, ({ press }) =>
      press.id === sample.id
        ? {
            state: GESTURE_IDLE,
            intent: {
              kind: 'pan-end',
              start: press.start,
              end: pointOf(sample),
              elapsed: sample.t - press.startedAt,
            },
          }
        : still(state),
    )
    .with({ kind: 'swiping' }, ({ press }) =>
      press.id === sample.id
        ? {
            state: GESTURE_IDLE,
            intent: {
              kind: 'swipe',
              start: press.start,
              end: pointOf(sample),
              elapsed: sample.t - press.startedAt,
            },
          }
        : still(state),
    )
    .with({ kind: 'selecting' }, ({ id }) =>
      id === sample.id
        ? { state: GESTURE_IDLE, intent: { kind: 'select-end', x: sample.x, y: sample.y } }
        : still(state),
    )
    .with({ kind: 'pinching' }, ({ first, second }) => {
      if (sample.id === first.id) return still({ kind: 'lifting', ids: [second.id] });
      if (sample.id === second.id) return still({ kind: 'lifting', ids: [first.id] });

      return still(state);
    })
    .with({ kind: 'lifting' }, ({ ids }) => still(lifted(ids, sample.id)))
    .exhaustive();
}

function cancel(state: GestureState, sample: GestureSample): GestureStep {
  return match<GestureState, GestureStep>(state)
    .with({ kind: 'idle' }, () => still(state))
    .with({ kind: 'pressed' }, ({ press }) =>
      press.id === sample.id ? still(GESTURE_IDLE) : still(state),
    )
    .with({ kind: 'swiping' }, ({ press }) =>
      press.id === sample.id ? still(GESTURE_IDLE) : still(state),
    )
    .with({ kind: 'panning' }, ({ press }) =>
      press.id === sample.id ? { state: GESTURE_IDLE, intent: CANCEL } : still(state),
    )
    .with({ kind: 'selecting' }, ({ id }) =>
      id === sample.id ? { state: GESTURE_IDLE, intent: CANCEL } : still(state),
    )
    .with({ kind: 'pinching' }, ({ first, second }) => {
      if (sample.id === first.id) return { state: lifted([second.id], first.id), intent: CANCEL };
      if (sample.id === second.id) return { state: lifted([first.id], second.id), intent: CANCEL };

      return still(state);
    })
    .with({ kind: 'lifting' }, ({ ids }) => still(lifted(ids, sample.id)))
    .exhaustive();
}

function tick(state: GestureState, t: number): GestureStep {
  return match<GestureState, GestureStep>(state)
    .with({ kind: 'idle' }, ({ pending }) =>
      pending !== null && t - pending.t >= DOUBLE_TAP_MS
        ? { state: GESTURE_IDLE, intent: tapAt(pending.at) }
        : still(state),
    )
    .with({ kind: 'pressed' }, ({ press, pending }) => {
      if (!isLongPress(press, t)) return still(state);
      if (pending !== null) {
        return { state: { kind: 'pressed', press, pending: null }, intent: tapAt(pending.at) };
      }

      return {
        state: { kind: 'selecting', id: press.id },
        intent: { kind: 'long-press', x: press.start.x, y: press.start.y },
      };
    })
    .with(
      { kind: 'panning' },
      { kind: 'swiping' },
      { kind: 'selecting' },
      { kind: 'pinching' },
      { kind: 'lifting' },
      () => still(state),
    )
    .exhaustive();
}

function gestureDeadline(state: GestureState): number | null {
  return match<GestureState, number | null>(state)
    .with({ kind: 'idle' }, ({ pending }) => (pending === null ? null : pending.t + DOUBLE_TAP_MS))
    .with({ kind: 'pressed' }, ({ press }) =>
      press.strayed ? null : press.startedAt + LONG_PRESS_MS,
    )
    .with(
      { kind: 'panning' },
      { kind: 'swiping' },
      { kind: 'selecting' },
      { kind: 'pinching' },
      { kind: 'lifting' },
      () => null,
    )
    .exhaustive();
}

function gestureStep(
  state: GestureState,
  input: GestureInput,
  context: GestureContext,
): GestureStep {
  if (input.kind === 'tick') return tick(state, input.t);
  if (input.type !== 'touch') return still(state);

  return match(input.kind)
    .with('down', () => down(state, input, context))
    .with('move', () => move(state, input))
    .with('up', () => up(state, input, context))
    .with('cancel', () => cancel(state, input))
    .exhaustive();
}

export {
  DOUBLE_TAP_MS,
  DOUBLE_TAP_SLOP_PX,
  LONG_PRESS_MS,
  GESTURE_IDLE,
  TOUCH_SLOP_PX,
  gestureDeadline,
  gestureStep,
};
export type {
  Point,
  GestureContext,
  GestureInput,
  GestureIntent,
  GestureSample,
  GestureState,
  GestureStep,
  GestureTick,
};
