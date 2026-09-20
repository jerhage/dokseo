import { describe, expect, it } from 'vitest';
import {
  hintsToShow,
  isReaderGesture,
  pagedHints,
  type GestureHint,
  type ReaderGesture,
} from './gesture-hint';

function taught(hints: readonly GestureHint[]): readonly (ReaderGesture | null)[] {
  return hints.map((hint) => hint.teaches);
}

describe('pagedHints', () => {
  it('offers the two pan gestures once the content overflows', () => {
    expect(taught(pagedHints(true))).toEqual(['select', 'space-pan', 'middle-pan']);
  });

  it('offers zooming in place of panning while the content fits', () => {
    expect(taught(pagedHints(false))).toEqual(['select', 'zoom-to-pan']);
  });
});

describe('hintsToShow', () => {
  it('teaches every gesture to a reader who has performed none', () => {
    const shown = hintsToShow(pagedHints(true), [], false);

    expect(taught(shown)).toEqual(['select', 'space-pan', 'middle-pan', null]);
  });

  it('drops a gesture the reader has already performed', () => {
    const shown = hintsToShow(pagedHints(true), ['select'], false);

    expect(taught(shown)).toEqual(['space-pan', 'middle-pan', null]);
  });

  it('closes with the key that brings it back', () => {
    const shown = hintsToShow(pagedHints(false), ['select'], false);

    expect(shown.at(-1)).toEqual({ keys: ['?'], does: 'show or hide this', teaches: null });
  });

  it('shows nothing once every gesture on offer is learned', () => {
    expect(hintsToShow(pagedHints(false), ['select', 'zoom-to-pan'], false)).toEqual([]);
  });

  it('keeps teaching a gesture the reader learned in the other state', () => {
    const shown = hintsToShow(pagedHints(true), ['zoom-to-pan'], false);

    expect(taught(shown)).toEqual(['select', 'space-pan', 'middle-pan', null]);
  });

  it('shows every gesture again when the reader asks for them back', () => {
    const shown = hintsToShow(pagedHints(true), ['select', 'space-pan', 'middle-pan'], true);

    expect(taught(shown)).toEqual(['select', 'space-pan', 'middle-pan', null]);
  });
});

describe('isReaderGesture', () => {
  it('accepts a gesture the hint can teach', () => {
    expect(isReaderGesture('space-pan')).toBe(true);
  });

  it('rejects anything else a stale store holds', () => {
    expect(isReaderGesture('wiggle')).toBe(false);
  });
});
