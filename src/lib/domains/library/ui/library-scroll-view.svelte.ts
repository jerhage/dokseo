import { match } from 'ts-pattern';
import type { LibraryBody } from './library-overview';
import { returnsFromReader, scrollStep, scrollTopFrom } from './library-scroll';

type ScrollMemory = { top: number | null };

const TAB_MEMORY: ScrollMemory = { top: null };

class LibraryScrollView {
  readonly #memory: ScrollMemory;
  #pending = $state<number | null>(null);
  #top = 0;

  constructor(memory: ScrollMemory = TAB_MEMORY) {
    this.#memory = memory;
  }

  track(top: number): void {
    this.#top = top;
  }

  capture(): number {
    this.#memory.top = this.#top;
    return this.#top;
  }

  restore(value: unknown): void {
    const top = scrollTopFrom(value);
    if (top !== null) this.#pending = top;
  }

  arrive(navigation: string, from: string | null): void {
    if (returnsFromReader(navigation, from)) this.restore(this.#memory.top);
  }

  settle(body: LibraryBody): number | null {
    return match(scrollStep(this.#pending, body))
      .with({ kind: 'wait' }, () => null)
      .with({ kind: 'scroll' }, ({ top }) => this.#finish(top))
      .with({ kind: 'none' }, () => this.#finish(null))
      .exhaustive();
  }

  #finish(top: number | null): number | null {
    this.#pending = null;
    return top;
  }
}

export { LibraryScrollView };
export type { ScrollMemory };
