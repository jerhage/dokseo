import { match } from 'ts-pattern';
import { TOUCH_SLOP_PX } from '$lib/components/gesture';
import type { GestureIntent, Point } from '$lib/components/gesture';
import {
  SWIPE_AXIS_RATIO,
  SWIPE_MIN_PX,
  SWIPE_MIN_PX_PER_MS,
  swipeTurn,
} from '$lib/shared/page-turn';
import type { TouchTurns, TurnSide } from '$lib/shared/page-turn';

type GestureMark = { readonly at: Point; readonly t: number };

type GestureStroke = { readonly start: Point; readonly end: Point; readonly elapsed: number };

type ReadKind = 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pan-end' | 'select-end';

type SwipeFling = 'distance' | 'speed' | 'neither';

type SwipeCheck = {
  readonly across: number;
  readonly along: number;
  readonly sideways: boolean;
  readonly fling: SwipeFling;
  readonly turn: TurnSide | null;
};

type SwipeArea = { readonly width: number; readonly turns: TouchTurns };

type GestureReading = {
  readonly kind: ReadKind;
  readonly distance: number;
  readonly duration: number;
  readonly speed: number | null;
  readonly swipe: SwipeCheck | null;
};

function strokeFrom(press: GestureMark | null, now: GestureMark): GestureStroke {
  const start = press ?? now;
  return { start: start.at, end: now.at, elapsed: now.t - start.t };
}

function heldStroke(press: GestureMark | null, now: GestureMark): GestureStroke {
  const start = press ?? now;
  return { start: start.at, end: start.at, elapsed: now.t - start.t };
}

function flingOf(distance: number, elapsed: number): SwipeFling {
  if (distance >= SWIPE_MIN_PX) return 'distance';
  if (distance >= TOUCH_SLOP_PX && elapsed > 0 && distance / elapsed >= SWIPE_MIN_PX_PER_MS) {
    return 'speed';
  }

  return 'neither';
}

function swipeCheck(stroke: GestureStroke, area: SwipeArea): SwipeCheck {
  const across = Math.abs(stroke.end.x - stroke.start.x);
  const along = Math.abs(stroke.end.y - stroke.start.y);
  return {
    across,
    along,
    sideways: across > SWIPE_AXIS_RATIO * along,
    fling: flingOf(across, stroke.elapsed),
    turn: swipeTurn(
      stroke.start,
      stroke.end,
      stroke.elapsed,
      { left: 0, width: area.width },
      area.width,
      area.turns,
    ),
  };
}

function readingOf(
  kind: ReadKind,
  stroke: GestureStroke,
  swipe: SwipeCheck | null,
): GestureReading {
  const distance = Math.hypot(stroke.end.x - stroke.start.x, stroke.end.y - stroke.start.y);
  return {
    kind,
    distance,
    duration: stroke.elapsed,
    speed: stroke.elapsed > 0 ? distance / stroke.elapsed : null,
    swipe,
  };
}

function gestureReading(
  intent: GestureIntent,
  press: GestureMark | null,
  now: GestureMark,
  area: SwipeArea,
): GestureReading | null {
  return match<GestureIntent, GestureReading | null>(intent)
    .with({ kind: 'tap' }, { kind: 'double-tap' }, { kind: 'select-end' }, ({ kind }) =>
      readingOf(kind, strokeFrom(press, now), null),
    )
    .with({ kind: 'long-press' }, () => readingOf('long-press', heldStroke(press, now), null))
    .with({ kind: 'swipe' }, { kind: 'pan-end' }, ({ kind, start, end, elapsed }) => {
      const stroke = { start, end, elapsed };
      return readingOf(kind, stroke, swipeCheck(stroke, area));
    })
    .with(
      { kind: 'none' },
      { kind: 'pan' },
      { kind: 'pinch' },
      { kind: 'select-begin' },
      { kind: 'select-move' },
      { kind: 'cancel' },
      () => null,
    )
    .exhaustive();
}

export { gestureReading, swipeCheck };
export type {
  GestureMark,
  GestureReading,
  GestureStroke,
  ReadKind,
  SwipeArea,
  SwipeCheck,
  SwipeFling,
};
