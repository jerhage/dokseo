export type ReaderGesture = 'select' | 'space-pan' | 'middle-pan' | 'zoom-to-pan';

export type GestureHint = {
  readonly keys: readonly string[];
  readonly does: string;
  readonly teaches: ReaderGesture | null;
};

const READER_GESTURES = new Set<string>(['select', 'space-pan', 'middle-pan', 'zoom-to-pan']);

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

export function isReaderGesture(value: string): value is ReaderGesture {
  return READER_GESTURES.has(value);
}

export function pagedHints(pannable: boolean): readonly GestureHint[] {
  return pannable ? WHEN_PANNABLE : WHEN_FITTED;
}

export function hintsToShow(
  chromeShown: boolean,
  hints: readonly GestureHint[],
  learned: readonly ReaderGesture[],
  revealed: boolean,
): readonly GestureHint[] {
  if (!chromeShown) return [];
  if (revealed) return [...hints, RECALL];

  const pending = hints.filter((hint) => hint.teaches !== null && !learned.includes(hint.teaches));

  return pending.length === 0 ? [] : [...pending, RECALL];
}
