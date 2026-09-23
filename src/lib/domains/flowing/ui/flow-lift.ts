import type { TextQuote } from '$lib/shared/anchor';
import { tapOnStage } from './flow-turn';
import type { Point, StageBox } from './flow-turn';

type LiftRect = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

type StageSize = {
  readonly width: number;
  readonly height: number;
};

type LiftPlacement =
  | { readonly kind: 'nowhere' }
  | { readonly kind: 'above'; readonly left: number; readonly top: number }
  | { readonly kind: 'below'; readonly left: number; readonly top: number };

type LiftedPassage = {
  readonly cfi: string;
  readonly quote: TextQuote;
};

type SelectionSeen = {
  readonly selected: boolean;
  readonly pointerHeld: boolean;
};

type OfferMove =
  | { readonly kind: 'keep' }
  | { readonly kind: 'clear' }
  | { readonly kind: 'place' };

const QUOTE_CONTEXT_CHARS = 32;

const LIFT_BUTTON_WIDTH_PX = 44;

const LIFT_BUTTON_HEIGHT_PX = 44;

const LIFT_BUTTON_GAP_PX = 8;

const NOWHERE_TO_OFFER: LiftPlacement = { kind: 'nowhere' };

const LEAVE_THE_OFFER_ALONE: OfferMove = { kind: 'keep' };

const TAKE_THE_OFFER_AWAY: OfferMove = { kind: 'clear' };

const STAND_THE_OFFER_OVER_IT: OfferMove = { kind: 'place' };

function offerMove(seen: SelectionSeen): OfferMove {
  if (!seen.selected) return TAKE_THE_OFFER_AWAY;
  if (seen.pointerHeld) return LEAVE_THE_OFFER_ALONE;

  return STAND_THE_OFFER_OVER_IT;
}

function keptBefore(text: string): string {
  const runes = Array.from(text);
  return runes.slice(Math.max(0, runes.length - QUOTE_CONTEXT_CHARS)).join('');
}

function keptAfter(text: string): string {
  return Array.from(text).slice(0, QUOTE_CONTEXT_CHARS).join('');
}

function passageQuote(exact: string, before: string, after: string): TextQuote {
  return { exact, prefix: keptBefore(before), suffix: keptAfter(after) };
}

function liftsAnything(exact: string): boolean {
  return exact.trim().length > 0;
}

function rectOnStage(rect: LiftRect, origin: Point, stage: StageBox): LiftRect {
  const start = tapOnStage({ x: rect.left, y: rect.top }, origin, stage);
  const end = tapOnStage({ x: rect.right, y: rect.bottom }, origin, stage);

  return { left: start.at.x, top: start.at.y, right: end.at.x, bottom: end.at.y };
}

function isPlaceable(rect: LiftRect): boolean {
  return [rect.left, rect.top, rect.right, rect.bottom].every((edge) => Number.isFinite(edge));
}

function showsOnStage(rect: LiftRect, stage: StageSize): boolean {
  if (!isPlaceable(rect)) return false;

  return rect.right > 0 && rect.left < stage.width && rect.bottom > 0 && rect.top < stage.height;
}

function spanOf(rects: readonly LiftRect[]): LiftRect | null {
  const [first] = rects;
  if (first === undefined) return null;

  return rects.reduce((span, rect) => ({
    left: Math.min(span.left, rect.left),
    top: Math.min(span.top, rect.top),
    right: Math.max(span.right, rect.right),
    bottom: Math.max(span.bottom, rect.bottom),
  }));
}

function clamped(value: number, low: number, high: number): number {
  if (high < low) return low;

  return Math.min(Math.max(value, low), high);
}

function liftPlacement(rects: readonly LiftRect[], stage: StageSize): LiftPlacement {
  if (!Number.isFinite(stage.width) || !Number.isFinite(stage.height)) return NOWHERE_TO_OFFER;
  if (stage.width <= 0 || stage.height <= 0) return NOWHERE_TO_OFFER;

  const span = spanOf(rects.filter((rect) => showsOnStage(rect, stage)));
  if (span === null) return NOWHERE_TO_OFFER;

  const left = clamped(
    (span.left + span.right) / 2 - LIFT_BUTTON_WIDTH_PX / 2,
    0,
    stage.width - LIFT_BUTTON_WIDTH_PX,
  );

  const above = span.top - LIFT_BUTTON_GAP_PX - LIFT_BUTTON_HEIGHT_PX;
  if (above >= 0) return { kind: 'above', left, top: above };

  const below = clamped(span.bottom + LIFT_BUTTON_GAP_PX, 0, stage.height - LIFT_BUTTON_HEIGHT_PX);

  return { kind: 'below', left, top: below };
}

export {
  LEAVE_THE_OFFER_ALONE,
  LIFT_BUTTON_GAP_PX,
  LIFT_BUTTON_HEIGHT_PX,
  LIFT_BUTTON_WIDTH_PX,
  NOWHERE_TO_OFFER,
  QUOTE_CONTEXT_CHARS,
  STAND_THE_OFFER_OVER_IT,
  TAKE_THE_OFFER_AWAY,
  liftPlacement,
  liftsAnything,
  offerMove,
  passageQuote,
  rectOnStage,
};
export type { LiftPlacement, LiftRect, LiftedPassage, OfferMove, SelectionSeen, StageSize };
