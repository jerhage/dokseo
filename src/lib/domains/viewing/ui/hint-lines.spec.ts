import { describe, expect, it } from 'vitest';
import type { GestureHint, HintScene, ReaderGesture } from './gesture-hint';
import { HintLines } from './hint-lines.svelte';
import type { HintLearning, HintSource } from './hint-lines.svelte';

type Held = {
  scene: HintScene;
  chromeShown: boolean;
  learned: readonly ReaderGesture[];
  wanted: boolean;
};

const POINTER_PAGED: HintScene = {
  input: 'pointer',
  layoutKind: 'paged',
  pannable: false,
  turns: 'tap-zones',
};

const TOUCH_STRIP: HintScene = {
  input: 'touch',
  layoutKind: 'continuous',
  pannable: false,
  turns: 'swipe-only',
};

function held(overrides: Partial<Held> = {}): Held {
  return { scene: POINTER_PAGED, chromeShown: true, learned: [], wanted: true, ...overrides };
}

function hintLines(state: Held): HintLines {
  const source = (): HintSource => ({ scene: state.scene, chromeShown: state.chromeShown });
  const learning: HintLearning = { learned: () => state.learned, wanted: () => state.wanted };
  return new HintLines(source, learning);
}

function keys(hints: readonly GestureHint[]): readonly string[] {
  return hints.map((hint) => hint.keys.join(' '));
}

describe('HintLines', () => {
  it('shows the unlearned hints of the scene with the recall line for a pointer', () => {
    const lines = hintLines(held());

    expect(keys(lines.pending)).toEqual(['drag', '+', '?']);
    expect(keys(lines.lines)).toEqual(['drag', '+', '?']);
    expect(lines.hushed).toBe(false);
  });

  it('shows the touch hints of a strip without a recall line', () => {
    const lines = hintLines(held({ scene: TOUCH_STRIP }));

    expect(keys(lines.lines)).toEqual(['long press drag', 'pinch']);
  });

  it('hushes and holds nothing while the chrome is hidden from the start', () => {
    const lines = hintLines(held({ chromeShown: false }));

    expect(lines.pending).toEqual([]);
    expect(lines.lines).toEqual([]);
    expect(lines.hushed).toBe(true);
  });

  it('hushes when the hints are not wanted', () => {
    const lines = hintLines(held({ wanted: false }));

    expect(lines.hushed).toBe(true);
  });

  it('reads its source again on each access', () => {
    const state = held();
    const lines = hintLines(state);
    const shown = keys(lines.lines);

    state.learned = ['select'];

    expect(shown).toEqual(['drag', '+', '?']);
    expect(keys(lines.lines)).toEqual(['+', '?']);
  });

  it('keeps the lines it last showed once nothing is pending, so the card fades with them', () => {
    const state = held();
    const lines = hintLines(state);
    const shown = lines.lines;

    state.chromeShown = false;

    expect(lines.pending).toEqual([]);
    expect(lines.lines).toBe(shown);
  });

  it('hides the shown hints when the recall key is pressed, keeping the lines it showed', () => {
    const lines = hintLines(held());
    const shown = lines.lines;

    lines.pressRecall();

    expect(lines.pending).toEqual([]);
    expect(lines.hushed).toBe(true);
    expect(lines.lines).toBe(shown);
  });

  it('holds nothing it was never asked to show', () => {
    const lines = hintLines(held());

    lines.pressRecall();

    expect(lines.lines).toEqual([]);
  });

  it('reveals every hint of the scene when the recall key is pressed with none shown', () => {
    const lines = hintLines(held({ learned: ['select', 'zoom-to-pan'] }));
    const before = lines.pending;

    lines.pressRecall();

    expect(before).toEqual([]);
    expect(keys(lines.pending)).toEqual(['drag', '+', '?']);
  });
});
