import { match } from 'ts-pattern';
import type { ReadingDirection } from '$lib/shared/layout-kind';

type Point = { readonly x: number; readonly y: number };

type KeyPress = {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly typing: boolean;
  readonly pressesOnSpace: boolean;
};

type PointerRelease = {
  readonly from: Point;
  readonly to: Point;
  readonly width: number;
  readonly textSelected: boolean;
};

type StageBox = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
};

type StageTap = {
  readonly at: Point;
  readonly width: number;
};

type KeyTarget = {
  readonly tagName: string;
  readonly type: string | null;
  readonly role: string | null;
  readonly editable: boolean;
};

type FlowMove =
  | { readonly kind: 'stay' }
  | { readonly kind: 'leftward' }
  | { readonly kind: 'rightward' }
  | { readonly kind: 'backward' }
  | { readonly kind: 'forward' };

type FlowTurn = 'previous' | 'next';

type FlowAction =
  | { readonly kind: 'nothing' }
  | { readonly kind: 'turn'; readonly move: FlowMove }
  | { readonly kind: 'chrome' };

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

const HOST_VIEWPORT_ORIGIN: Point = { x: 0, y: 0 };

const FRAME_NOWHERE_ON_THE_STAGE: Point = { x: Number.NaN, y: Number.NaN };

const STAY: FlowMove = { kind: 'stay' };

const LEFTWARD: FlowMove = { kind: 'leftward' };

const RIGHTWARD: FlowMove = { kind: 'rightward' };

const BACKWARD: FlowMove = { kind: 'backward' };

const FORWARD: FlowMove = { kind: 'forward' };

const LEFT_EDGE: ClickRegion = { kind: 'left-edge' };

const MIDDLE: ClickRegion = { kind: 'middle' };

const RIGHT_EDGE: ClickRegion = { kind: 'right-edge' };

const DOES_NOTHING: FlowAction = { kind: 'nothing' };

const TOGGLES_THE_CHROME: FlowAction = { kind: 'chrome' };

const SELECTING: PointerEnd = { kind: 'selecting' };

const DRAGGED: PointerEnd = { kind: 'dragged' };

const TYPED_INTO = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

const STEPPED_INSTEAD = new Set(['range']);

const PRESSED_ON_SPACE = new Set(['BUTTON']);

const BUTTON_ROLE = 'button';

function isTyping(target: KeyTarget | null): boolean {
  if (target === null) return false;
  if (target.editable) return true;
  if (target.type !== null && STEPPED_INSTEAD.has(target.type.toLowerCase())) return false;

  return TYPED_INTO.has(target.tagName.toUpperCase());
}

function pressesOnSpace(target: KeyTarget | null): boolean {
  if (target === null) return false;
  if (target.role !== null && target.role.toLowerCase() === BUTTON_ROLE) return true;

  return PRESSED_ON_SPACE.has(target.tagName.toUpperCase());
}

function keyMove(press: KeyPress): FlowMove {
  if (press.typing) return STAY;
  if (press.altKey || press.ctrlKey || press.metaKey) return STAY;
  if (press.key === ' ') {
    if (press.pressesOnSpace) return STAY;

    return press.shiftKey ? BACKWARD : FORWARD;
  }
  if (press.shiftKey) return STAY;

  return match(press.key)
    .with('ArrowLeft', () => LEFTWARD)
    .with('ArrowRight', () => RIGHTWARD)
    .with('ArrowUp', 'PageUp', () => BACKWARD)
    .with('ArrowDown', 'PageDown', () => FORWARD)
    .otherwise(() => STAY);
}

function tapOnStage(at: Point, origin: Point, stage: StageBox): StageTap {
  return {
    at: { x: at.x + origin.x - stage.left, y: at.y + origin.y - stage.top },
    width: stage.width,
  };
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

function releaseAction(end: PointerEnd): FlowAction {
  return match(end)
    .with({ kind: 'selecting' }, () => DOES_NOTHING)
    .with({ kind: 'dragged' }, () => DOES_NOTHING)
    .with({ kind: 'click', region: { kind: 'middle' } }, () => TOGGLES_THE_CHROME)
    .with({ kind: 'click' }, (hit) => ({ kind: 'turn' as const, move: moveForRegion(hit.region) }))
    .exhaustive();
}

function turnOrder(direction: ReadingDirection): readonly FlowTurn[] {
  return direction === 'rtl' ? ['next', 'previous'] : ['previous', 'next'];
}

function moveForTurn(turn: FlowTurn): FlowMove {
  return turn === 'previous' ? BACKWARD : FORWARD;
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
  FRAME_NOWHERE_ON_THE_STAGE,
  HOST_VIEWPORT_ORIGIN,
  isTyping,
  keyMove,
  moveForEnd,
  moveForRegion,
  moveForTurn,
  pointerEnded,
  pressesOnSpace,
  regionAt,
  releaseAction,
  tapOnStage,
  turnOrder,
  turnPage,
};
export type {
  ClickRegion,
  FlowAction,
  FlowMove,
  FlowTurn,
  KeyPress,
  KeyTarget,
  PageTurner,
  Point,
  PointerEnd,
  PointerRelease,
  StageBox,
  StageTap,
};
