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

class HintLines {
  #source: () => HintSource;
  #learning: HintLearning;
  #recall = $state<HintRecall>('earned');
  #held: readonly GestureHint[] = [];

  #pending = $derived.by<readonly GestureHint[]>(() => {
    const held = this.#source();
    return hintsToShow(readerHints(held.scene), this.#learning.learned(), {
      chromeShown: held.chromeShown,
      wanted: this.#learning.wanted(),
      recall: this.#recall,
      input: held.scene.input,
    });
  });

  #lines = $derived.by<readonly GestureHint[]>(() => {
    this.#held = heldHints(this.#held, this.#pending);
    return this.#held;
  });

  constructor(source: () => HintSource, learning: HintLearning = REMEMBERED_LEARNING) {
    this.#source = source;
    this.#learning = learning;
  }

  get pending(): readonly GestureHint[] {
    return this.#pending;
  }

  get lines(): readonly GestureHint[] {
    return this.#lines;
  }

  get hushed(): boolean {
    return this.#pending.length === 0;
  }

  pressRecall(): void {
    this.#recall = recallAfterPress(this.#pending);
  }
}

export { HintLines };
export type { HintLearning, HintSource };
