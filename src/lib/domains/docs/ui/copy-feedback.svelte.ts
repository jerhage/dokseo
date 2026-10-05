import type { Clock } from '$lib/ui/components/clock';

type CopyOutcome = 'copied' | 'refused';

const COPIED_HOLD_MS = 2000;

class CopyFeedback {
  #copied = $state(false);
  #cancelReset: (() => void) | null = null;
  readonly #write: (text: string) => Promise<void>;
  readonly #clock: Clock;

  constructor(write: (text: string) => Promise<void>, clock: Clock) {
    this.#write = write;
    this.#clock = clock;
  }

  get copied(): boolean {
    return this.#copied;
  }

  async copy(text: string): Promise<CopyOutcome> {
    try {
      await this.#write(text);
    } catch {
      return 'refused';
    }
    this.#cancelReset?.();
    this.#copied = true;
    this.#cancelReset = this.#clock.schedule(() => {
      this.#copied = false;
      this.#cancelReset = null;
    }, COPIED_HOLD_MS);
    return 'copied';
  }
}

export { COPIED_HOLD_MS, CopyFeedback };
export type { CopyOutcome };
