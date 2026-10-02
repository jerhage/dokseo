import { describe, expect, it } from 'vitest';
import {
  heldHints,
  hintsToShow,
  inputKind,
  isReaderGesture,
  pagedHints,
  readerHints,
  recallAfterPress,
} from './gesture-hint';
import type { GestureHint, HintRecall, HintScene, InputKind, ReaderGesture } from './gesture-hint';

function visible(
  chromeShown: boolean,
  hints: readonly GestureHint[],
  learned: readonly ReaderGesture[],
  recall: HintRecall,
  input: InputKind,
): readonly GestureHint[] {
  return hintsToShow(hints, learned, { chromeShown, wanted: true, recall, input });
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
    const shown = visible(true, pagedHints(true), [], 'earned', 'pointer');

    expect(taught(shown)).toEqual(['select', 'space-pan', 'middle-pan', null]);
  });

  it('drops a gesture the reader has already performed', () => {
    const shown = visible(true, pagedHints(true), ['select'], 'earned', 'pointer');

    expect(taught(shown)).toEqual(['space-pan', 'middle-pan', null]);
  });

  it('closes with the key that brings it back', () => {
    const shown = visible(true, pagedHints(false), ['select'], 'earned', 'pointer');

    expect(shown.at(-1)).toEqual({ keys: ['?'], does: 'show or hide this', teaches: null });
  });

  it('shows nothing once every gesture on offer is learned', () => {
    expect(
      visible(true, pagedHints(false), ['select', 'zoom-to-pan'], 'earned', 'pointer'),
    ).toEqual([]);
  });

  it('keeps teaching a gesture the reader learned in the other state', () => {
    const shown = visible(true, pagedHints(true), ['zoom-to-pan'], 'earned', 'pointer');

    expect(taught(shown)).toEqual(['select', 'space-pan', 'middle-pan', null]);
  });

  it('shows every gesture again when the reader asks for them back', () => {
    const shown = visible(
      true,
      pagedHints(true),
      ['select', 'space-pan', 'middle-pan'],
      'revealed',
      'pointer',
    );

    expect(taught(shown)).toEqual(['select', 'space-pan', 'middle-pan', null]);
  });

  it('shows nothing while the chrome is hidden, however little the reader has learned', () => {
    expect(visible(false, pagedHints(true), [], 'earned', 'pointer')).toEqual([]);
  });

  it('shows nothing while the chrome is hidden, even once the reader asked them back', () => {
    expect(visible(false, pagedHints(true), [], 'revealed', 'pointer')).toEqual([]);
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
    const shown = visible(true, readerHints(TOUCH_PAGED), [], 'earned', 'touch');

    expect(taught(shown)).toEqual(['swipe', 'touch-select', 'pinch', 'double-tap']);
  });

  it('shows every touch line without the ? line when revealed', () => {
    const learned: readonly ReaderGesture[] = ['swipe', 'touch-select', 'pinch', 'double-tap'];
    const shown = visible(true, readerHints(TOUCH_PAGED), learned, 'revealed', 'touch');

    expect(taught(shown)).toEqual(['swipe', 'touch-select', 'pinch', 'double-tap']);
  });
});

describe('hintsToShow with hints turned off', () => {
  it('shows nothing in any recall, for either input', () => {
    const recalls: readonly HintRecall[] = ['earned', 'hidden', 'revealed'];
    const inputs: readonly InputKind[] = ['pointer', 'touch'];

    for (const recall of recalls) {
      for (const input of inputs) {
        const hints = readerHints({ ...TOUCH_PAGED, input, pannable: true });
        const shown = hintsToShow(hints, [], { chromeShown: true, wanted: false, recall, input });

        expect(shown).toEqual([]);
      }
    }
  });
});

describe('hintsToShow when hidden', () => {
  it('shows no line to a mouse or a touch reader who has learned nothing', () => {
    expect(visible(true, pagedHints(true), [], 'hidden', 'pointer')).toEqual([]);
    expect(visible(true, readerHints(TOUCH_PAGED), [], 'hidden', 'touch')).toEqual([]);
  });
});

describe('recallAfterPress', () => {
  it('reveals every line once none is visible', () => {
    const learned: readonly ReaderGesture[] = ['select', 'space-pan', 'middle-pan'];
    const shown = visible(true, pagedHints(true), learned, 'earned', 'pointer');

    expect(recallAfterPress(shown)).toBe('revealed');
  });

  it('changes what a reader who has learned nothing sees, on every press', () => {
    const presses: HintRecall[] = [];
    let recall: HintRecall = 'earned';
    let shown = visible(true, pagedHints(true), [], recall, 'pointer');
    const seen = [taught(shown)];

    for (let press = 0; press < 3; press += 1) {
      recall = recallAfterPress(shown);
      presses.push(recall);
      shown = visible(true, pagedHints(true), [], recall, 'pointer');
      seen.push(taught(shown));
    }

    expect(presses).toEqual(['hidden', 'revealed', 'hidden']);
    expect(seen).toEqual([
      ['select', 'space-pan', 'middle-pan', null],
      [],
      ['select', 'space-pan', 'middle-pan', null],
      [],
    ]);
  });
});

describe('isReaderGesture', () => {
  const EVERY_GESTURE: Record<ReaderGesture, true> = {
    select: true,
    'space-pan': true,
    'middle-pan': true,
    'zoom-to-pan': true,
    swipe: true,
    'tap-sides': true,
    'touch-select': true,
    pinch: true,
    'double-tap': true,
  };

  it('accepts every gesture the hint can teach, pointer and touch alike', () => {
    for (const gesture of Object.keys(EVERY_GESTURE)) {
      expect(isReaderGesture(gesture), gesture).toBe(true);
    }
  });

  it('rejects anything else a stale store holds', () => {
    expect(isReaderGesture('wiggle')).toBe(false);
  });
});

describe('heldHints', () => {
  it('takes the pending hints when there are some', () => {
    expect(taught(heldHints(pagedHints(false), pagedHints(true)))).toEqual([
      'select',
      'space-pan',
      'middle-pan',
    ]);
  });

  it('keeps the hints it held once nothing is pending, so the fading card keeps its lines', () => {
    expect(taught(heldHints(pagedHints(true), []))).toEqual(['select', 'space-pan', 'middle-pan']);
  });
});
