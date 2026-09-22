import { match } from 'ts-pattern';

type Point = { readonly x: number; readonly y: number };

type KeyPress = {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly typing: boolean;
};

type PointerRelease = {
  readonly from: Point;
  readonly to: Point;
  readonly width: number;
  readonly textSelected: boolean;
};

type TypingTarget = {
  readonly tagName: string;
  readonly editable: boolean;
};

type FlowMove =
  | { readonly kind: 'stay' }
  | { readonly kind: 'leftward' }
  | { readonly kind: 'rightward' }
  | { readonly kind: 'backward' }
  | { readonly kind: 'forward' };

type ClickRegion =
  | { readonly kind: 'left-edge' }
  | { readonly kind: 'middle' }
  | { readonly kind: 'right-edge' };

type PointerEnd =
  | { readonly kind: 'selecting' }
  | { readonly kind: 'dragged' }
  | { readonly kind: 'click'; readonly region: ClickRegion };

type PageTurner = {
  goLeft(): unknown;
  goRight(): unknown;
  prev(): unknown;
  next(): unknown;
};

const CLICK_SLOP_PX = 3;

const EDGE_SHARE = 0.25;

const STAY: FlowMove = { kind: 'stay' };

const LEFTWARD: FlowMove = { kind: 'leftward' };

const RIGHTWARD: FlowMove = { kind: 'rightward' };

const BACKWARD: FlowMove = { kind: 'backward' };

const FORWARD: FlowMove = { kind: 'forward' };

const LEFT_EDGE: ClickRegion = { kind: 'left-edge' };

const MIDDLE: ClickRegion = { kind: 'middle' };

const RIGHT_EDGE: ClickRegion = { kind: 'right-edge' };

const SELECTING: PointerEnd = { kind: 'selecting' };

const DRAGGED: PointerEnd = { kind: 'dragged' };

const TYPED_INTO = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

function isTyping(target: TypingTarget | null): boolean {
  if (target === null) return false;
  if (target.editable) return true;

  return TYPED_INTO.has(target.tagName.toUpperCase());
}

function keyMove(press: KeyPress): FlowMove {
  if (press.typing) return STAY;
  if (press.altKey || press.ctrlKey || press.metaKey) return STAY;
  if (press.key === ' ') return press.shiftKey ? BACKWARD : FORWARD;
  if (press.shiftKey) return STAY;

  return match(press.key)
    .with('ArrowLeft', () => LEFTWARD)
    .with('ArrowRight', () => RIGHTWARD)
    .with('ArrowUp', 'PageUp', () => BACKWARD)
    .with('ArrowDown', 'PageDown', () => FORWARD)
    .otherwise(() => STAY);
}

function regionAt(x: number, width: number): ClickRegion {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return MIDDLE;

  const edge = width * EDGE_SHARE;
  if (x < edge) return LEFT_EDGE;
  if (x > width - edge) return RIGHT_EDGE;

  return MIDDLE;
}

function stayedStill(from: Point, to: Point): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;

  return Math.abs(dx) < CLICK_SLOP_PX && Math.abs(dy) < CLICK_SLOP_PX;
}

function pointerEnded(release: PointerRelease): PointerEnd {
  if (release.textSelected) return SELECTING;
  if (!stayedStill(release.from, release.to)) return DRAGGED;

  return { kind: 'click', region: regionAt(release.to.x, release.width) };
}

function moveForRegion(region: ClickRegion): FlowMove {
  return match(region)
    .with({ kind: 'left-edge' }, () => LEFTWARD)
    .with({ kind: 'middle' }, () => STAY)
    .with({ kind: 'right-edge' }, () => RIGHTWARD)
    .exhaustive();
}

function moveForEnd(end: PointerEnd): FlowMove {
  return match(end)
    .with({ kind: 'selecting' }, () => STAY)
    .with({ kind: 'dragged' }, () => STAY)
    .with({ kind: 'click' }, (hit) => moveForRegion(hit.region))
    .exhaustive();
}

function turnPage(pages: PageTurner, move: FlowMove): void {
  match(move)
    .with({ kind: 'stay' }, () => undefined)
    .with({ kind: 'leftward' }, () => {
      void pages.goLeft();
    })
    .with({ kind: 'rightward' }, () => {
      void pages.goRight();
    })
    .with({ kind: 'backward' }, () => {
      void pages.prev();
    })
    .with({ kind: 'forward' }, () => {
      void pages.next();
    })
    .exhaustive();
}

export {
  CLICK_SLOP_PX,
  EDGE_SHARE,
  isTyping,
  keyMove,
  moveForEnd,
  moveForRegion,
  pointerEnded,
  regionAt,
  turnPage,
};
export type {
  ClickRegion,
  FlowMove,
  KeyPress,
  PageTurner,
  Point,
  PointerEnd,
  PointerRelease,
  TypingTarget,
};
