import type { BookId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { Capture } from '../../domain/capture/capture';
import { clearCapturesMutation } from '../../queries/capture-queries';
import type { CaptureWrites } from '../../queries/capture-queries';
import type { CaptureCache } from './capture-cache';
import type { ClearCapturesResult } from '../../use-cases/capture/clear-captures';
import type { PanelCapture } from './panel-capture';
import { refuse } from './storage-failure';
import type { UnsavedCards } from './unsaved-cards.svelte';

const CLEAR_FAILED = 'Your captures could not be deleted';

type Emptied = {
  readonly rows: readonly Capture[];
  readonly unsaved: readonly PanelCapture[];
};

class CaptureClearing {
  #notify: Notify;
  #cache: CaptureCache;
  #unsaved: UnsavedCards;
  #openBook: () => BookId | null;
  #clearing: WriteQuery<ClearCapturesResult, BookId>;

  constructor(
    recognition: CaptureWrites,
    notify: Notify,
    cache: CaptureCache,
    unsaved: UnsavedCards,
    openBook: () => BookId | null,
  ) {
    this.#notify = notify;
    this.#cache = cache;
    this.#unsaved = unsaved;
    this.#openBook = openBook;
    this.#clearing = writeQuery(() => ({
      ...clearCapturesMutation(recognition),
      onMutate: async (book): Promise<Emptied> => {
        await cache.cancel(book);
        return { rows: cache.empty(book), unsaved: unsaved.empty() };
      },
      onSuccess: (cleared, book, emptied) => {
        if (cleared.kind === 'success') return;
        this.#putBack(book, emptied);
        refuse(this.#notify, CLEAR_FAILED, cleared);
      },
      onError: (cause, book, emptied) => {
        if (emptied !== undefined) this.#putBack(book, emptied);
        this.#notify({ tone: 'danger', title: CLEAR_FAILED, message: failureMessage(cause) });
      },
      onSettled: (_cleared, _cause, book) => cache.refresh(book),
    }));
  }

  async clear(book: BookId | null): Promise<void> {
    if (book === null) return;

    await this.#clearing.run(book).catch(() => null);
  }

  #putBack(book: BookId, emptied: Emptied): void {
    this.#cache.restore(book, emptied.rows);
    if (this.#openBook() === book) this.#unsaved.restore(emptied.unsaved);
  }
}

export { CLEAR_FAILED, CaptureClearing };
export type { Emptied };
