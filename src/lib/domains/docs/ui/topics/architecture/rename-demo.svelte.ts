import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import { GRAMMAR_TAG, HELD_TAGS, rehearseRename } from './rename-rehearsal';
import type { Rehearsal, StoreMode } from './rename-rehearsal';

const STORE_MODES: readonly { readonly value: StoreMode; readonly label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'throws', label: 'Throws' },
];

function isStoreMode(value: string): value is StoreMode {
  return STORE_MODES.some((mode) => mode.value === value);
}

class RenameRehearsalView {
  chosen = $state.raw<Tag>(GRAMMAR_TAG);
  draft = $state('Kanji');
  mode = $state<StoreMode>('working');
  outcome = $state.raw<Rehearsal | null>(null);

  #generation = 0;

  choose(id: string): void {
    const tag = HELD_TAGS.find((held) => held.id === id);
    if (tag !== undefined) this.chosen = tag;
  }

  chooseMode(value: string): void {
    if (isStoreMode(value)) this.mode = value;
  }

  async run(): Promise<void> {
    const generation = ++this.#generation;
    const outcome = await rehearseRename(HELD_TAGS, this.chosen, this.draft, this.mode);
    if (generation !== this.#generation) return;
    this.outcome = outcome;
  }
}

export { RenameRehearsalView, STORE_MODES, isStoreMode };
