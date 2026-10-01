import type { Container } from '$lib/container';
import { LOADING, readFailed, readReady, reloading } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import type { Capture } from '../../domain/capture/capture';
import type { PassageOrder } from '../../domain/capture/capture-order';
import { matchesByBook, matchTally } from '../../domain/capture/capture-results';
import type { SearchedBook } from '../../domain/capture/capture-results';
import type { Tag } from '../../domain/tag/tag';
import { describeStorageFailure, thrownFailure } from './storage-failure';

type CaptureFind = { readonly kind: 'idle' } | ReadState<readonly Capture[]>;

const IDLE: CaptureFind = { kind: 'idle' };

const NO_CAPTURES: readonly Capture[] = [];

function foundCaptures(find: CaptureFind): readonly Capture[] {
  return find.kind === 'ready' ? find.value : NO_CAPTURES;
}

class CaptureSearchView {
  state = $state.raw<CaptureFind>(IDLE);
  tags = $state.raw<readonly Tag[]>([]);

  #container: Container;
  #passages: PassageOrder;
  #generation = 0;

  constructor(container: Container, passages: PassageOrder) {
    this.#container = container;
    this.#passages = passages;
  }

  get captures(): readonly Capture[] {
    return foundCaptures(this.state);
  }

  get passages(): PassageOrder {
    return this.#passages;
  }

  get count(): number {
    return this.captures.length;
  }

  matchCount(books: readonly SearchedBook[], query: string): number {
    return matchTally(matchesByBook(this.captures, books, query, this.#passages));
  }

  async load(): Promise<void> {
    const generation = ++this.#generation;
    this.state = this.state.kind === 'idle' ? LOADING : reloading(this.state);

    const [listed, named] = await Promise.all([
      this.#container.recognition.listEveryCapture().catch(thrownFailure),
      this.#container.recognition.listTags().catch(thrownFailure),
    ]);
    if (generation !== this.#generation) return;

    this.tags = named.ok ? named.value : [];
    this.state = listed.ok
      ? readReady(listed.value)
      : readFailed(describeStorageFailure(listed.error));
  }

  dispose(): void {
    this.#generation += 1;
    this.state = IDLE;
    this.tags = [];
  }
}

export { foundCaptures, CaptureSearchView };
export type { CaptureFind };
