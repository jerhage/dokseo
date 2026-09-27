import { match } from 'ts-pattern';
import type { GestureIntent, GestureState } from '$lib/components/gesture';
import type { Point } from '../domain/selection';

type StripTouchAction =
  | { readonly kind: 'none' }
  | { readonly kind: 'toggle-chrome' }
  | { readonly kind: 'zoom'; readonly scale: number; readonly from: Point; readonly to: Point }
  | { readonly kind: 'select-begin'; readonly from: Point; readonly to: Point }
  | { readonly kind: 'select-move'; readonly at: Point }
  | { readonly kind: 'select-end'; readonly at: Point }
  | { readonly kind: 'drop' };

const NOTHING: StripTouchAction = { kind: 'none' };

const TOGGLE_CHROME: StripTouchAction = { kind: 'toggle-chrome' };

function stripTouchAction(intent: GestureIntent): StripTouchAction {
  return match<GestureIntent, StripTouchAction>(intent)
    .with({ kind: 'none' }, () => NOTHING)
    .with({ kind: 'tap' }, { kind: 'double-tap' }, () => TOGGLE_CHROME)
    .with({ kind: 'pan' }, { kind: 'pan-end' }, { kind: 'swipe' }, () => NOTHING)
    .with({ kind: 'pinch' }, ({ scale, cx, cy, dx, dy }) => ({
      kind: 'zoom',
      scale,
      from: { x: cx - dx, y: cy - dy },
      to: { x: cx, y: cy },
    }))
    .with({ kind: 'long-press' }, ({ x, y }) => ({
      kind: 'select-begin',
      from: { x, y },
      to: { x, y },
    }))
    .with({ kind: 'select-begin' }, ({ from, to }) => ({ kind: 'select-begin', from, to }))
    .with({ kind: 'select-move' }, ({ x, y }) => ({ kind: 'select-move', at: { x, y } }))
    .with({ kind: 'select-end' }, ({ x, y }) => ({ kind: 'select-end', at: { x, y } }))
    .with({ kind: 'cancel' }, () => ({ kind: 'drop' }))
    .exhaustive();
}

function holdsTheScroll(state: GestureState, fingers: number): boolean {
  if (fingers > 1) return true;

  return match(state)
    .with({ kind: 'selecting' }, { kind: 'pinching' }, { kind: 'lifting' }, () => true)
    .with(
      { kind: 'idle' },
      { kind: 'pressed' },
      { kind: 'panning' },
      { kind: 'swiping' },
      () => false,
    )
    .exhaustive();
}

export { holdsTheScroll, stripTouchAction };
export type { StripTouchAction };
