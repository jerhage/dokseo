import { match } from 'ts-pattern';
import { clickSlop } from '$lib/shared/click-slop';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { CLICK_EDGE_SHARE, tapZone, towards } from '$lib/shared/page-turn';
import type { TapZone, TouchTurns, TurnSide } from '$lib/shared/page-turn';

type Point = { readonly x: number; readonly y: number };

type KeyPress = {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly focus: KeyFocus;
};

type PointerRelease = {
  readonly from: Point;
  readonly to: Point;
  readonly pointerType: string;
  readonly width: number;
  readonly textSelected: boolean;
  readonly turns: TouchTurns;
  readonly edgeClicksTurn: boolean;
  readonly chromeShown: boolean;
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

type KeyFocus =
  | { readonly kind: 'typing' }
  | { readonly kind: 'slider' }
  | { readonly kind: 'button' }
  | { readonly kind: 'elsewhere' };

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

const HOST_VIEWPORT_ORIGIN: Point = { x: 0, y: 0 };

const FRAME_NOWHERE_ON_THE_STAGE: Point = { x: Number.NaN, y: Number.NaN };

const STAY: FlowMove = { kind: 'stay' };

const LEFTWARD: FlowMove = { kind: 'leftward' };

const RIGHTWARD: FlowMove = { kind: 'rightward' };

const BACKWARD: FlowMove = { kind: 'backward' };

const FORWARD: FlowMove = { kind: 'forward' };

const TYPING: KeyFocus = { kind: 'typing' };

const SLIDER: KeyFocus = { kind: 'slider' };

const BUTTON: KeyFocus = { kind: 'button' };

const ELSEWHERE: KeyFocus = { kind: 'elsewhere' };

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

const STEPPED_BY_A_SLIDER = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

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

function isSlider(target: KeyTarget | null): boolean {
  if (target === null || target.editable) return false;

  return target.type !== null && STEPPED_INSTEAD.has(target.type.toLowerCase());
}

function keyFocus(target: KeyTarget | null): KeyFocus {
  if (isTyping(target)) return TYPING;
  if (isSlider(target)) return SLIDER;
  if (pressesOnSpace(target)) return BUTTON;

  return ELSEWHERE;
}

function pagingMove(press: KeyPress): FlowMove {
  if (press.key === ' ') return press.shiftKey ? BACKWARD : FORWARD;
  if (press.shiftKey) return STAY;

  return match(press.key)
    .with('ArrowLeft', () => LEFTWARD)
    .with('ArrowRight', () => RIGHTWARD)
    .with('ArrowUp', 'PageUp', () => BACKWARD)
    .with('ArrowDown', 'PageDown', () => FORWARD)
    .otherwise(() => STAY);
}

function keyMove(press: KeyPress): FlowMove {
  if (press.altKey || press.ctrlKey || press.metaKey) return STAY;

  return match(press.focus)
    .with({ kind: 'typing' }, () => STAY)
    .with({ kind: 'slider' }, () => (STEPPED_BY_A_SLIDER.has(press.key) ? STAY : pagingMove(press)))
    .with({ kind: 'button' }, () => (press.key === ' ' ? STAY : pagingMove(press)))
    .with({ kind: 'elsewhere' }, () => pagingMove(press))
    .exhaustive();
}

function tapOnStage(at: Point, origin: Point, stage: StageBox): StageTap {
  return {
    at: { x: at.x + origin.x - stage.left, y: at.y + origin.y - stage.top },
    width: stage.width,
  };
}

function regionAt(x: number, width: number): ClickRegion {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return MIDDLE;

  const edge = width * CLICK_EDGE_SHARE;
  if (x < edge) return LEFT_EDGE;
  if (x > width - edge) return RIGHT_EDGE;

  return MIDDLE;
}

function touchRegionAt(
  x: number,
  width: number,
  turns: TouchTurns,
  chromeShown: boolean,
): ClickRegion {
  if (chromeShown) return MIDDLE;

  return match<TapZone, ClickRegion>(tapZone(x, width, turns))
    .with('left', () => LEFT_EDGE)
    .with('centre', () => MIDDLE)
    .with('right', () => RIGHT_EDGE)
    .exhaustive();
}

function releasedRegion(release: PointerRelease): ClickRegion {
  if (release.pointerType !== 'touch') {
    return release.edgeClicksTurn ? regionAt(release.to.x, release.width) : MIDDLE;
  }

  return touchRegionAt(release.to.x, release.width, release.turns, release.chromeShown);
}

function stayedStill(from: Point, to: Point, pointerType: string): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;

  const slop = clickSlop(pointerType);
  return Math.abs(dx) < slop && Math.abs(dy) < slop;
}

function pointerEnded(release: PointerRelease): PointerEnd {
  if (release.textSelected) return SELECTING;
  if (!stayedStill(release.from, release.to, release.pointerType)) return DRAGGED;

  return { kind: 'click', region: releasedRegion(release) };
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

function dismissesTheArrival(action: FlowAction): boolean {
  return match(action)
    .with({ kind: 'nothing' }, () => false)
    .with({ kind: 'turn' }, () => true)
    .with({ kind: 'chrome' }, () => true)
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

function turnOrder(direction: ReadingDirection): readonly [FlowTurn, FlowTurn] {
  return direction === 'rtl' ? ['next', 'previous'] : ['previous', 'next'];
}

function turnTowards(side: TurnSide, direction: ReadingDirection): FlowTurn {
  return towards(side, turnOrder(direction));
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
  FRAME_NOWHERE_ON_THE_STAGE,
  HOST_VIEWPORT_ORIGIN,
  isTyping,
  keyFocus,
  keyMove,
  moveForEnd,
  moveForRegion,
  moveForTurn,
  pointerEnded,
  pressesOnSpace,
  dismissesTheArrival,
  regionAt,
  releaseAction,
  tapOnStage,
  touchRegionAt,
  turnOrder,
  turnPage,
  turnTowards,
};
export type {
  ClickRegion,
  FlowAction,
  FlowMove,
  FlowTurn,
  KeyFocus,
  KeyPress,
  KeyTarget,
  PageTurner,
  Point,
  PointerEnd,
  PointerRelease,
  StageBox,
  StageTap,
};
