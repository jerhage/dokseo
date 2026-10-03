import { BookCapturesExport } from '$lib/shared/book-captures-export.svelte';
import type { BookCapturesExporting } from '$lib/shared/book-captures-export.svelte';
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
import type { CaptureList } from './capture-list.svelte';
import { clearScope } from './clearing';
import type { ClearScope } from './clearing';
import type { PanelCapture } from './panel-capture';
import { refuse } from './storage-failure';

const CLEAR_FAILED = 'Your captures could not be deleted';

type Emptied = {
  readonly rows: readonly Capture[];
  readonly unsaved: readonly PanelCapture[];
};

class ClearAll {
  readonly capturesExport: BookCapturesExport;
  #notify: Notify;
  #list: CaptureList;
  #cache: CaptureCache;
  #confirming = $state(false);
  #clearing: WriteQuery<ClearCapturesResult, BookId>;

  constructor(
    recognition: CaptureWrites & BookCapturesExporting,
    notify: Notify,
    list: CaptureList,
    cache: CaptureCache,
  ) {
    this.capturesExport = new BookCapturesExport(recognition);
    this.#notify = notify;
    this.#list = list;
    this.#cache = cache;
    this.#clearing = writeQuery(() => ({
      ...clearCapturesMutation(recognition),
      onMutate: async (book): Promise<Emptied> => {
        await cache.cancel(book);
        return { rows: cache.empty(book), unsaved: list.unsaved.empty() };
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

  get confirming(): boolean {
    return this.#confirming;
  }

  get scope(): ClearScope {
    return clearScope(this.#list.captures);
  }

  ask(): void {
    if (this.#list.count === 0) return;
    this.#confirming = true;
    const book = this.#list.book;
    if (book !== null) void this.capturesExport.prepare(book);
  }

  dismiss(): void {
    this.#confirming = false;
  }

  async clear(): Promise<void> {
    const book = this.#list.book;
    this.#confirming = false;
    if (book === null) return;

    await this.#clearing.run(book).catch(() => null);
  }

  #putBack(book: BookId, emptied: Emptied): void {
    this.#cache.restore(book, emptied.rows);
    if (this.#list.book === book) this.#list.unsaved.restore(emptied.unsaved);
  }
}

export { CLEAR_FAILED, ClearAll };
export type { Emptied };
