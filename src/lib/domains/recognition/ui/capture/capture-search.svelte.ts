import type { Container } from '$lib/container';
import type { Capture } from '../../domain/capture/capture';
import { matchesByBook, matchTally } from '../../domain/capture/capture-results';
import type { SearchedBook } from '../../domain/capture/capture-results';

type CaptureSearchStatus = 'idle' | 'loading' | 'ready' | 'failed';

class CaptureSearchView {
  captures = $state.raw<readonly Capture[]>([]);
  status = $state<CaptureSearchStatus>('idle');

  #container: Container;
  #generation = 0;

  constructor(container: Container) {
    this.#container = container;
  }

  get count(): number {
    return this.captures.length;
  }

  matchCount(books: readonly SearchedBook[], query: string): number {
    return matchTally(matchesByBook(this.captures, books, query));
  }

  async load(): Promise<void> {
    const generation = ++this.#generation;
    this.status = 'loading';

    const listed = await this.#container.recognition.listEveryCapture().catch(() => null);
    if (generation !== this.#generation) return;

    if (listed === null || !listed.ok) {
      this.captures = [];
      this.status = 'failed';
      return;
    }

    this.captures = listed.value;
    this.status = 'ready';
  }

  dispose(): void {
    this.#generation += 1;
    this.captures = [];
    this.status = 'idle';
  }
}

export { CaptureSearchView };
export type { CaptureSearchStatus };
