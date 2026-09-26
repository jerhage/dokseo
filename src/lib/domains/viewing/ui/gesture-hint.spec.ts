import { describe, expect, it } from 'vitest';
import { hintsToShow, inputKind, isReaderGesture, pagedHints, readerHints } from './gesture-hint';
import type { GestureHint, HintScene, InputKind, ReaderGesture } from './gesture-hint';

function visible(
  chromeShown: boolean,
  hints: readonly GestureHint[],
  learned: readonly ReaderGesture[],
  revealed: boolean,
  input: InputKind,
): readonly GestureHint[] {
  return hintsToShow(hints, learned, { chromeShown, wanted: true, revealed, input });
}

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
    const shown = visible(true, pagedHints(true), [], false, 'pointer');

    expect(taught(shown)).toEqual(['select', 'space-pan', 'middle-pan', null]);
  });

  it('drops a gesture the reader has already performed', () => {
    const shown = visible(true, pagedHints(true), ['select'], false, 'pointer');

    expect(taught(shown)).toEqual(['space-pan', 'middle-pan', null]);
  });

  it('closes with the key that brings it back', () => {
    const shown = visible(true, pagedHints(false), ['select'], false, 'pointer');

    expect(shown.at(-1)).toEqual({ keys: ['?'], does: 'show or hide this', teaches: null });
  });

  it('shows nothing once every gesture on offer is learned', () => {
    expect(visible(true, pagedHints(false), ['select', 'zoom-to-pan'], false, 'pointer')).toEqual(
      [],
    );
  });

  it('keeps teaching a gesture the reader learned in the other state', () => {
    const shown = visible(true, pagedHints(true), ['zoom-to-pan'], false, 'pointer');

    expect(taught(shown)).toEqual(['select', 'space-pan', 'middle-pan', null]);
  });

  it('shows every gesture again when the reader asks for them back', () => {
    const shown = visible(
      true,
      pagedHints(true),
      ['select', 'space-pan', 'middle-pan'],
      true,
      'pointer',
    );

    expect(taught(shown)).toEqual(['select', 'space-pan', 'middle-pan', null]);
  });

  it('shows nothing while the chrome is hidden, however little the reader has learned', () => {
    expect(visible(false, pagedHints(true), [], false, 'pointer')).toEqual([]);
  });

  it('shows nothing while the chrome is hidden, even once the reader asked them back', () => {
    expect(visible(false, pagedHints(true), [], true, 'pointer')).toEqual([]);
  });
});

const TOUCH_PAGED: HintScene = {
  input: 'touch',
  layoutKind: 'paged',
  pannable: false,
  turns: 'swipe-only',
};

describe('inputKind', () => {
  it('starts from a coarse pointer as touch', () => {
    expect(inputKind(null, true)).toBe('touch');
  });

  it('starts from a fine pointer as the pointer set', () => {
    expect(inputKind(null, false)).toBe('pointer');
  });

  it('follows a touch on a device that began fine', () => {
    expect(inputKind('touch', false)).toBe('touch');
  });

  it('follows a mouse on a device that began coarse', () => {
    expect(inputKind('mouse', true)).toBe('pointer');
  });

  it('treats a pen as the pointer set', () => {
    expect(inputKind('pen', true)).toBe('pointer');
  });

  it('keeps the starting guess for a pointer type it does not know', () => {
    expect(inputKind('', true)).toBe('touch');
  });
});

describe('readerHints', () => {
  it('gives a pointer on a page exactly the mouse and keyboard lines', () => {
    const scene: HintScene = { ...TOUCH_PAGED, input: 'pointer', pannable: true };

    expect(readerHints(scene)).toEqual(pagedHints(true));
  });

  it('gives a pointer on a strip no lines', () => {
    expect(readerHints({ ...TOUCH_PAGED, input: 'pointer', layoutKind: 'continuous' })).toEqual([]);
  });

  it('teaches swipe, long press, pinch and double tap on a page in swipe only', () => {
    expect(taught(readerHints(TOUCH_PAGED))).toEqual([
      'swipe',
      'touch-select',
      'pinch',
      'double-tap',
    ]);
  });

  it('adds tapping the sides on a page in tap zones', () => {
    expect(taught(readerHints({ ...TOUCH_PAGED, turns: 'tap-zones' }))).toEqual([
      'swipe',
      'tap-sides',
      'touch-select',
      'pinch',
      'double-tap',
    ]);
  });

  it('teaches long press and pinch on a strip', () => {
    expect(taught(readerHints({ ...TOUCH_PAGED, layoutKind: 'continuous' }))).toEqual([
      'touch-select',
      'pinch',
    ]);
  });

  it('labels the touch lines in words a phone reader knows', () => {
    expect(readerHints({ ...TOUCH_PAGED, turns: 'tap-zones' }).map((hint) => hint.keys)).toEqual([
      ['swipe'],
      ['tap the sides'],
      ['long press', 'drag'],
      ['pinch'],
      ['double tap'],
    ]);
  });
});

describe('hintsToShow for touch', () => {
  it('leaves out the ? line, since a phone has no ? key', () => {
    const shown = visible(true, readerHints(TOUCH_PAGED), [], false, 'touch');

    expect(taught(shown)).toEqual(['swipe', 'touch-select', 'pinch', 'double-tap']);
  });

  it('drops a touch gesture the reader has performed', () => {
    const shown = visible(true, readerHints(TOUCH_PAGED), ['swipe', 'pinch'], false, 'touch');

    expect(taught(shown)).toEqual(['touch-select', 'double-tap']);
  });

  it('shows nothing once every touch gesture is learned', () => {
    const learned: readonly ReaderGesture[] = ['swipe', 'touch-select', 'pinch', 'double-tap'];

    expect(visible(true, readerHints(TOUCH_PAGED), learned, false, 'touch')).toEqual([]);
  });

  it('shows every touch line without the ? line when revealed', () => {
    const learned: readonly ReaderGesture[] = ['swipe', 'touch-select', 'pinch', 'double-tap'];
    const shown = visible(true, readerHints(TOUCH_PAGED), learned, true, 'touch');

    expect(taught(shown)).toEqual(['swipe', 'touch-select', 'pinch', 'double-tap']);
  });

  it('keeps teaching the touch lines to a reader who learned only the mouse ones', () => {
    const shown = visible(true, readerHints(TOUCH_PAGED), ['select'], false, 'touch');

    expect(taught(shown)).toEqual(['swipe', 'touch-select', 'pinch', 'double-tap']);
  });

  it('shows nothing while the chrome is hidden', () => {
    expect(visible(false, readerHints(TOUCH_PAGED), [], false, 'touch')).toEqual([]);
  });
});

describe('hintsToShow with hints turned off', () => {
  it('shows nothing to a mouse reader who has learned nothing', () => {
    const shown = hintsToShow(pagedHints(true), [], {
      chromeShown: true,
      wanted: false,
      revealed: false,
      input: 'pointer',
    });

    expect(shown).toEqual([]);
  });

  it('shows nothing to a touch reader who has learned nothing', () => {
    const shown = hintsToShow(readerHints(TOUCH_PAGED), [], {
      chromeShown: true,
      wanted: false,
      revealed: false,
      input: 'touch',
    });

    expect(shown).toEqual([]);
  });

  it('shows nothing even when the reader presses ?', () => {
    const shown = hintsToShow(pagedHints(true), [], {
      chromeShown: true,
      wanted: false,
      revealed: true,
      input: 'pointer',
    });

    expect(shown).toEqual([]);
  });
});

describe('isReaderGesture', () => {
  it('accepts a touch gesture the hint can teach', () => {
    expect(isReaderGesture('touch-select')).toBe(true);
  });

  it('accepts a gesture the hint can teach', () => {
    expect(isReaderGesture('space-pan')).toBe(true);
  });

  it('rejects anything else a stale store holds', () => {
    expect(isReaderGesture('wiggle')).toBe(false);
  });
});
