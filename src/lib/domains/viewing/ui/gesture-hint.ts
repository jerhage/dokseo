import { match } from 'ts-pattern';
import type { ImageLayoutKind } from '$lib/shared/layout-kind';
import type { TouchTurns } from '$lib/shared/page-turn';

type ReaderGesture =
  | 'select'
  | 'space-pan'
  | 'middle-pan'
  | 'zoom-to-pan'
  | 'swipe'
  | 'tap-sides'
  | 'touch-select'
  | 'pinch'
  | 'double-tap';

type InputKind = 'touch' | 'pointer';

type GestureHint = {
  readonly keys: readonly string[];
  readonly does: string;
  readonly teaches: ReaderGesture | null;
};

type HintShowing = {
  readonly chromeShown: boolean;
  readonly wanted: boolean;
  readonly revealed: boolean;
  readonly input: InputKind;
};

type HintScene = {
  readonly input: InputKind;
  readonly layoutKind: ImageLayoutKind;
  readonly pannable: boolean;
  readonly turns: TouchTurns;
};

const READER_GESTURES = new Set<string>([
  'select',
  'space-pan',
  'middle-pan',
  'zoom-to-pan',
  'swipe',
  'tap-sides',
  'touch-select',
  'pinch',
  'double-tap',
]);

const RECALL: GestureHint = { keys: ['?'], does: 'show or hide this', teaches: null };

const WHEN_PANNABLE: readonly GestureHint[] = [
  { keys: ['drag'], does: 'select a region', teaches: 'select' },
  { keys: ['space', 'drag'], does: 'pan', teaches: 'space-pan' },
  { keys: ['middle', 'drag'], does: 'pan', teaches: 'middle-pan' },
];

const WHEN_FITTED: readonly GestureHint[] = [
  { keys: ['drag'], does: 'select a region', teaches: 'select' },
  { keys: ['+'], does: 'zoom in to pan', teaches: 'zoom-to-pan' },
];

const SWIPE: GestureHint = { keys: ['swipe'], does: 'turn the page', teaches: 'swipe' };

const TAP_SIDES: GestureHint = {
  keys: ['tap the sides'],
  does: 'turn the page',
  teaches: 'tap-sides',
};

const TOUCH_SELECT: GestureHint = {
  keys: ['long press', 'drag'],
  does: 'select a region',
  teaches: 'touch-select',
};

const PINCH: GestureHint = { keys: ['pinch'], does: 'zoom', teaches: 'pinch' };

const DOUBLE_TAP: GestureHint = {
  keys: ['double tap'],
  does: 'zoom in or out',
  teaches: 'double-tap',
};

const TOUCH_STRIP: readonly GestureHint[] = [TOUCH_SELECT, PINCH];

function isReaderGesture(value: string): value is ReaderGesture {
  return READER_GESTURES.has(value);
}

function inputKind(lastPointerType: string | null, coarse: boolean): InputKind {
  if (lastPointerType === 'touch') return 'touch';
  if (lastPointerType === 'mouse' || lastPointerType === 'pen') return 'pointer';
  return coarse ? 'touch' : 'pointer';
}

function pagedHints(pannable: boolean): readonly GestureHint[] {
  return pannable ? WHEN_PANNABLE : WHEN_FITTED;
}

function touchPagedHints(turns: TouchTurns): readonly GestureHint[] {
  return match(turns)
    .with('tap-zones', () => [SWIPE, TAP_SIDES, TOUCH_SELECT, PINCH, DOUBLE_TAP])
    .with('swipe-only', () => [SWIPE, TOUCH_SELECT, PINCH, DOUBLE_TAP])
    .exhaustive();
}

function readerHints(scene: HintScene): readonly GestureHint[] {
  return match([scene.input, scene.layoutKind] as const)
    .with(['pointer', 'paged'], () => pagedHints(scene.pannable))
    .with(['pointer', 'continuous'], () => [])
    .with(['touch', 'paged'], () => touchPagedHints(scene.turns))
    .with(['touch', 'continuous'], () => TOUCH_STRIP)
    .exhaustive();
}

function withRecall(hints: readonly GestureHint[], input: InputKind): readonly GestureHint[] {
  return input === 'pointer' ? [...hints, RECALL] : hints;
}

function hintsToShow(
  hints: readonly GestureHint[],
  learned: readonly ReaderGesture[],
  showing: HintShowing,
): readonly GestureHint[] {
  if (!showing.chromeShown || !showing.wanted) return [];
  if (showing.revealed) return withRecall(hints, showing.input);

  const pending = hints.filter((hint) => hint.teaches !== null && !learned.includes(hint.teaches));

  return pending.length === 0 ? [] : withRecall(pending, showing.input);
}

function heldHints(
  previous: readonly GestureHint[],
  pending: readonly GestureHint[],
): readonly GestureHint[] {
  return pending.length > 0 ? pending : previous;
}

export { heldHints, hintsToShow, inputKind, isReaderGesture, pagedHints, readerHints };
export type { GestureHint, HintScene, HintShowing, InputKind, ReaderGesture };
