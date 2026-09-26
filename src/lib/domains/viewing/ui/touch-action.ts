import { match } from 'ts-pattern';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { swipeTurn, tapZone } from '$lib/shared/page-turn';
import type { FrameSpan, TapZone, TouchTurns } from '$lib/shared/page-turn';
import { overscrollTurn } from '../domain/overscroll';
import type { PanReach } from '../domain/overscroll';
import type { Point } from '../domain/selection';
import type { ReaderGesture } from './gesture-hint';
import { moveTowards } from './page-moves';
import type { PageMove } from './page-moves';
import type { TouchIntent } from './touch-gesture';

type TouchScene = {
  readonly chromeShown: boolean;
  readonly turns: TouchTurns;
  readonly direction: ReadingDirection;
  readonly frame: FrameSpan;
  readonly viewportWidth: number;
  readonly reach: PanReach | null;
};

type TouchAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'toggle-chrome' }
  | { readonly kind: 'turn'; readonly move: PageMove }
  | { readonly kind: 'pan'; readonly dx: number; readonly dy: number }
  | {
      readonly kind: 'pinch';
      readonly scale: number;
      readonly cx: number;
      readonly cy: number;
      readonly dx: number;
      readonly dy: number;
    }
  | { readonly kind: 'zoom-toggle'; readonly at: Point }
  | { readonly kind: 'select-begin'; readonly from: Point; readonly to: Point }
  | { readonly kind: 'select-move'; readonly at: Point }
  | { readonly kind: 'select-end'; readonly at: Point }
  | { readonly kind: 'drop' };

const NOTHING: TouchAction = { kind: 'none' };

const TOGGLE_CHROME: TouchAction = { kind: 'toggle-chrome' };

function turnTo(move: PageMove): TouchAction {
  return { kind: 'turn', move };
}

function tapAction(x: number, scene: TouchScene): TouchAction {
  if (scene.chromeShown) return TOGGLE_CHROME;

  return match<TapZone, TouchAction>(tapZone(x - scene.frame.left, scene.frame.width, scene.turns))
    .with('centre', () => TOGGLE_CHROME)
    .with('left', 'right', (side) => turnTo(moveTowards(side, 'paged', scene.direction)))
    .exhaustive();
}

function swipeAction(start: Point, end: Point, elapsed: number, scene: TouchScene): TouchAction {
  const side = swipeTurn(start, end, elapsed, scene.frame, scene.viewportWidth, scene.turns);
  return side === null ? NOTHING : turnTo(moveTowards(side, 'paged', scene.direction));
}

function panEndAction(start: Point, end: Point, elapsed: number, scene: TouchScene): TouchAction {
  if (scene.reach === null) return NOTHING;

  const side = overscrollTurn(
    scene.reach,
    { start, end, elapsed },
    { span: scene.frame, viewportWidth: scene.viewportWidth, turns: scene.turns },
  );
  return side === null ? NOTHING : turnTo(moveTowards(side, 'paged', scene.direction));
}

function doubleTapAction(at: Point, scene: TouchScene): TouchAction {
  return scene.chromeShown ? TOGGLE_CHROME : { kind: 'zoom-toggle', at };
}

function touchAction(intent: TouchIntent, scene: TouchScene): TouchAction {
  return match<TouchIntent, TouchAction>(intent)
    .with({ kind: 'none' }, () => NOTHING)
    .with({ kind: 'tap' }, ({ x }) => tapAction(x, scene))
    .with({ kind: 'swipe' }, ({ start, end, elapsed }) => swipeAction(start, end, elapsed, scene))
    .with({ kind: 'pan' }, ({ dx, dy }) => ({ kind: 'pan', dx, dy }))
    .with({ kind: 'long-press' }, ({ x, y }) => ({
      kind: 'select-begin',
      from: { x, y },
      to: { x, y },
    }))
    .with({ kind: 'select-begin' }, ({ from, to }) => ({ kind: 'select-begin', from, to }))
    .with({ kind: 'select-move' }, ({ x, y }) => ({ kind: 'select-move', at: { x, y } }))
    .with({ kind: 'select-end' }, ({ x, y }) => ({ kind: 'select-end', at: { x, y } }))
    .with({ kind: 'cancel' }, () => ({ kind: 'drop' }))
    .with({ kind: 'pan-end' }, ({ start, end, elapsed }) =>
      panEndAction(start, end, elapsed, scene),
    )
    .with({ kind: 'pinch' }, ({ scale, cx, cy, dx, dy }) => ({
      kind: 'pinch',
      scale,
      cx,
      cy,
      dx,
      dy,
    }))
    .with({ kind: 'double-tap' }, ({ x, y }) => doubleTapAction({ x, y }, scene))
    .exhaustive();
}

function touchLesson(intent: TouchIntent, action: TouchAction): ReaderGesture | null {
  return match<TouchAction, ReaderGesture | null>(action)
    .with({ kind: 'turn' }, () => (intent.kind === 'tap' ? 'tap-sides' : 'swipe'))
    .with({ kind: 'pinch' }, () => 'pinch')
    .with({ kind: 'zoom-toggle' }, () => 'double-tap')
    .with(
      { kind: 'none' },
      { kind: 'toggle-chrome' },
      { kind: 'pan' },
      { kind: 'select-begin' },
      { kind: 'select-move' },
      { kind: 'select-end' },
      { kind: 'drop' },
      () => null,
    )
    .exhaustive();
}

export { touchAction, touchLesson };
export type { TouchAction, TouchScene };
