import { TOUCH_SLOP_PX } from './click-slop';

type TouchTurns = 'tap-zones' | 'swipe-only';

type TapZone = 'left' | 'centre' | 'right';

type TurnSide = 'left' | 'right';

type SwipeFinger = 'left' | 'right';

type TurnPoint = { readonly x: number; readonly y: number };

type FrameSpan = { readonly left: number; readonly width: number };

const SIDE_ZONE_SHARE = 0.3;

const SWIPE_MIN_PX = 50;

const SWIPE_MIN_PX_PER_MS = 0.3;

const SWIPE_AXIS_RATIO = 1.5;

const EDGE_GUTTER_PX = 24;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function tapZone(x: number, frameWidth: number, turns: TouchTurns): TapZone {
  if (turns === 'swipe-only') return 'centre';
  if (!Number.isFinite(x) || !isPositiveFinite(frameWidth)) return 'centre';

  const side = frameWidth * SIDE_ZONE_SHARE;
  if (x < side) return 'left';
  if (x > frameWidth - side) return 'right';

  return 'centre';
}

function inEdgeGutter(x: number, viewportWidth: number): boolean {
  return x < EDGE_GUTTER_PX || x > viewportWidth - EDGE_GUTTER_PX;
}

function onFrame(x: number, frame: FrameSpan): boolean {
  return x >= frame.left && x <= frame.left + frame.width;
}

function isFlung(distance: number, elapsedMs: number): boolean {
  if (distance >= SWIPE_MIN_PX) return true;
  if (distance < TOUCH_SLOP_PX || !isPositiveFinite(elapsedMs)) return false;

  return distance / elapsedMs >= SWIPE_MIN_PX_PER_MS;
}

function swipedSide(finger: SwipeFinger): TurnSide {
  return finger === 'left' ? 'right' : 'left';
}

function swipeTurn(
  start: TurnPoint,
  end: TurnPoint,
  elapsedMs: number,
  frame: FrameSpan,
  viewportWidth: number,
  turns: TouchTurns,
): TurnSide | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (!isPositiveFinite(frame.width) || !onFrame(start.x, frame)) return null;
  if (turns === 'swipe-only' && inEdgeGutter(start.x, viewportWidth)) return null;

  const across = Math.abs(dx);
  if (across <= SWIPE_AXIS_RATIO * Math.abs(dy)) return null;
  if (!isFlung(across, elapsedMs)) return null;

  return swipedSide(dx < 0 ? 'left' : 'right');
}

function swipeMayStart(
  start: TurnPoint,
  frame: FrameSpan,
  viewportWidth: number,
  turns: TouchTurns,
): boolean {
  if (!Number.isFinite(start.x)) return false;
  if (!isPositiveFinite(frame.width) || !onFrame(start.x, frame)) return false;

  return turns !== 'swipe-only' || !inEdgeGutter(start.x, viewportWidth);
}

function towards<T>(side: TurnSide, order: readonly [T, T]): T {
  return side === 'left' ? order[0] : order[1];
}

export {
  EDGE_GUTTER_PX,
  SIDE_ZONE_SHARE,
  SWIPE_AXIS_RATIO,
  SWIPE_MIN_PX,
  SWIPE_MIN_PX_PER_MS,
  swipeMayStart,
  swipeTurn,
  swipedSide,
  tapZone,
  towards,
};
export type { FrameSpan, SwipeFinger, TapZone, TouchTurns, TurnPoint, TurnSide };
