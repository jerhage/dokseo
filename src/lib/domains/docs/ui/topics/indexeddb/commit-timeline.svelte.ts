import { describeCause } from '$lib/shared/cause';
import type { CommitNote, CommitTone, CommitVariant } from './auto-commit';

type TimelineEntry = { readonly at: number; readonly tone: CommitTone; readonly text: string };

type CommitTimelineDeps = {
  readonly run: (variant: CommitVariant, note: CommitNote) => Promise<void>;
  readonly now: () => number;
};

class CommitTimeline {
  #variant = $state<CommitVariant>('unrelated-await');
  #entries = $state.raw<readonly TimelineEntry[]>([]);
  #running = $state(false);
  readonly #deps: CommitTimelineDeps;

  constructor(deps: CommitTimelineDeps) {
    this.#deps = deps;
  }

  get variant(): CommitVariant {
    return this.#variant;
  }

  set variant(variant: CommitVariant) {
    this.#variant = variant;
  }

  get entries(): readonly TimelineEntry[] {
    return this.#entries;
  }

  get running(): boolean {
    return this.#running;
  }

  async run(): Promise<void> {
    if (this.#running) return;
    this.#running = true;
    this.#entries = [];
    const started = this.#deps.now();
    const note: CommitNote = (tone, text) => {
      this.#entries = [...this.#entries, { at: this.#deps.now() - started, tone, text }];
    };
    try {
      await this.#deps.run(this.#variant, note);
    } catch (cause) {
      note('failure', describeCause(cause));
    } finally {
      this.#running = false;
    }
  }
}

export { CommitTimeline };
export type { CommitTimelineDeps, TimelineEntry };
