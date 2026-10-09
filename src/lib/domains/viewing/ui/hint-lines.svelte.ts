import { heldHints, hintsToShow, readerHints, recallAfterPress } from './gesture-hint';
import type { GestureHint, HintRecall, HintScene, ReaderGesture } from './gesture-hint';
import { hintsWanted, learnedGestures } from './learned-gestures.svelte';

type HintSource = {
  readonly scene: HintScene;
  readonly chromeShown: boolean;
};

type HintLearning = {
  readonly learned: () => readonly ReaderGesture[];
  readonly wanted: () => boolean;
};

const REMEMBERED_LEARNING: HintLearning = { learned: learnedGestures, wanted: hintsWanted };

function createHintLines(source: () => HintSource, learning: HintLearning = REMEMBERED_LEARNING) {
  let recall = $state<HintRecall>('earned');
  let held: readonly GestureHint[] = [];

  const pending = $derived.by<readonly GestureHint[]>(() => {
    const current = source();
    return hintsToShow(readerHints(current.scene), learning.learned(), {
      chromeShown: current.chromeShown,
      wanted: learning.wanted(),
      recall,
      input: current.scene.input,
    });
  });

  const lines = $derived.by<readonly GestureHint[]>(() => {
    held = heldHints(held, pending);
    return held;
  });

  return {
    get pending(): readonly GestureHint[] {
      return pending;
    },
    get lines(): readonly GestureHint[] {
      return lines;
    },
    get hushed(): boolean {
      return pending.length === 0;
    },
    pressRecall(): void {
      recall = recallAfterPress(pending);
    },
  };
}

export { createHintLines };
export type { HintLearning, HintSource };
