import { match } from 'ts-pattern';

type MarqueePoint = { readonly x: number; readonly y: number };

type MarqueeRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type MarqueeBox = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

type MarqueeEnd =
  | { readonly kind: 'click' }
  | { readonly kind: 'too-small'; readonly selection: MarqueeRect }
  | { readonly kind: 'selection'; readonly selection: MarqueeRect };

type MarqueeRefusal =
  | { readonly kind: 'pointer-mismatch'; readonly held: number; readonly released: number }
  | { readonly kind: 'no-drag-origin'; readonly hasSurface: boolean; readonly hasAnchor: boolean };

type MarqueeStroke = {
  readonly from: MarqueePoint;
  readonly to: MarqueePoint;
  readonly surface: HTMLElement;
};

type MarqueePointers = 'any' | readonly string[];

type MarqueePressFacts = {
  readonly ready: boolean;
  readonly primary: boolean;
  readonly button: number;
  readonly onContent: boolean;
  readonly pointerType: string;
};

type MarqueePress =
  | { readonly kind: 'ignored' }
  | { readonly kind: 'watched' }
  | { readonly kind: 'drawn' };

const EMPTY_RECT: MarqueeRect = { x: 0, y: 0, width: 0, height: 0 };

const NOT_SCROLLED: MarqueePoint = { x: 0, y: 0 };

function isFinitePoint(point: MarqueePoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function marqueeRect(from: MarqueePoint, to: MarqueePoint): MarqueeRect {
  if (!isFinitePoint(from) || !isFinitePoint(to)) return EMPTY_RECT;

  const width = to.x - from.x;
  const height = to.y - from.y;
  return {
    x: width < 0 ? from.x + width : from.x,
    y: height < 0 ? from.y + height : from.y,
    width: Math.abs(width),
    height: Math.abs(height),
  };
}

function scrolledFurther(travelled: MarqueePoint, by: MarqueePoint): MarqueePoint {
  if (!isFinitePoint(by)) return travelled;

  return { x: travelled.x + by.x, y: travelled.y + by.y };
}

function anchorOnScreen(anchor: MarqueePoint, travelled: MarqueePoint): MarqueePoint {
  return { x: anchor.x - travelled.x, y: anchor.y - travelled.y };
}

function anchoredRect(
  anchor: MarqueePoint,
  travelled: MarqueePoint,
  pointer: MarqueePoint,
): MarqueeRect {
  return marqueeRect(anchorOnScreen(anchor, travelled), pointer);
}

function within(rect: MarqueeRect, limit: number): boolean {
  return rect.width < limit && rect.height < limit;
}

function marqueeEnd(
  from: MarqueePoint,
  to: MarqueePoint,
  slop: number,
  minimum: number,
): MarqueeEnd {
  const selection = marqueeRect(from, to);
  if (within(selection, slop)) return { kind: 'click' };
  if (selection.width < minimum || selection.height < minimum) {
    return { kind: 'too-small', selection };
  }

  return { kind: 'selection', selection };
}

function stayedPut(from: MarqueePoint, to: MarqueePoint, minimum: number): boolean {
  return within(marqueeRect(from, to), minimum);
}

function drawsWith(pointers: MarqueePointers, pointerType: string): boolean {
  return pointers === 'any' || pointers.includes(pointerType);
}

function marqueePress(facts: MarqueePressFacts, pointers: MarqueePointers): MarqueePress {
  if (!facts.ready || !facts.primary || facts.button !== 0 || !facts.onContent) {
    return { kind: 'ignored' };
  }

  return drawsWith(pointers, facts.pointerType) ? { kind: 'drawn' } : { kind: 'watched' };
}

function marqueeBox(from: MarqueePoint, to: MarqueePoint, corner: MarqueePoint): MarqueeBox | null {
  const rect = marqueeRect(from, to);
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    left: rect.x - corner.x,
    top: rect.y - corner.y,
    width: rect.width,
    height: rect.height,
  };
}

function endsInClick(end: MarqueeEnd): boolean {
  return match(end)
    .with({ kind: 'click' }, () => true)
    .with({ kind: 'too-small' }, { kind: 'selection' }, () => false)
    .exhaustive();
}

export {
  NOT_SCROLLED,
  anchorOnScreen,
  anchoredRect,
  drawsWith,
  endsInClick,
  marqueeBox,
  marqueeEnd,
  marqueePress,
  marqueeRect,
  scrolledFurther,
  stayedPut,
};
export type {
  MarqueeBox,
  MarqueeEnd,
  MarqueePoint,
  MarqueePointers,
  MarqueePress,
  MarqueePressFacts,
  MarqueeRect,
  MarqueeRefusal,
  MarqueeStroke,
};
