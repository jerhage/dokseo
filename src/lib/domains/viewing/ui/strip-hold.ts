import type { ReadingPosition } from '../domain/reading-position';
import type { Point } from '../domain/selection';
import { positionAtScroll, scrollForPosition } from '../domain/strip';
import type { SliceLayout } from '../domain/strip';

type StripHold = {
  readonly position: ReadingPosition;
  readonly top: number;
  readonly across: number;
  readonly left: number;
};

type StripScroll = {
  readonly top: number;
  readonly left: number;
};

function heldAtScroll(
  layout: readonly SliceLayout[],
  width: number,
  previous: StripHold,
  scroll: StripScroll,
): StripHold {
  return {
    position: positionAtScroll(layout, scroll.top) ?? previous.position,
    top: 0,
    across: width > 0 ? scroll.left / width : 0,
    left: 0,
  };
}

function heldAround(
  layout: readonly SliceLayout[],
  width: number,
  previous: StripHold,
  scroll: StripScroll,
  was: Point,
  now: Point,
): StripHold {
  return {
    position: positionAtScroll(layout, scroll.top + was.y) ?? previous.position,
    top: now.y,
    across: width > 0 ? (scroll.left + was.x) / width : 0,
    left: now.x,
  };
}

function heldAt(previous: StripHold, position: ReadingPosition): StripHold {
  return { position, top: 0, across: previous.across, left: 0 };
}

function scrollForHold(
  layout: readonly SliceLayout[],
  width: number,
  hold: StripHold,
): StripScroll {
  return {
    top: scrollForPosition(layout, hold.position) - hold.top,
    left: width * hold.across - hold.left,
  };
}

export { heldAround, heldAt, heldAtScroll, scrollForHold };
export type { StripHold, StripScroll };
