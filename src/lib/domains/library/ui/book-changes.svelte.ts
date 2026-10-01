import type { Container } from '$lib/container';
import type { BookId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
import type { Result } from '$lib/shared/result';
import type { Book, BookEdit } from '../domain/book/book';
import type { LibraryError } from '../domain/book/library-repository';
import type { LibraryBooks } from './library-books.svelte';
import { describeLibraryError } from './library-error-text';
import { onShelf } from './library-shelves';
import type { Shelf } from './library-shelves';

type ChangeOutcome = 'changed' | 'failed' | 'skipped';

type Mark = 'finished' | 'unread';

type BookChange =
  | { readonly kind: 'idle' }
  | { readonly kind: 'removing'; readonly id: BookId }
  | { readonly kind: 'editing'; readonly id: BookId };

const NO_CHANGE: BookChange = { kind: 'idle' };

const EDIT_FAILED = 'Could not save the book settings';

const REMOVE_FAILED = 'Could not remove that book';

const FINISH_FAILED = 'Could not mark that book finished';

const UNREAD_FAILED = 'Could not mark that book unread';

const UNDO_MARK_FAILED = 'Could not undo that change';

function markedTitle(mark: Mark, book: Book): string {
  return mark === 'finished' ? `Marked ${book.title} finished` : `Marked ${book.title} unread`;
}

class BookChanges {
  #state = $state.raw<BookChange>(NO_CHANGE);
  #container: Container;
  #notify: Notify;
  #library: LibraryBooks;
  #uploading: () => boolean;

  constructor(
    container: Container,
    notify: Notify,
    library: LibraryBooks,
    uploading: () => boolean,
  ) {
    this.#container = container;
    this.#notify = notify;
    this.#library = library;
    this.#uploading = uploading;
  }

  get removing(): BookId | null {
    return this.#state.kind === 'removing' ? this.#state.id : null;
  }

  get editing(): BookId | null {
    return this.#state.kind === 'editing' ? this.#state.id : null;
  }

  async remove(id: BookId): Promise<ChangeOutcome> {
    if (this.#blocked()) return 'skipped';
    this.#state = { kind: 'removing', id };

    try {
      const removed = await this.#container.library.removeBook(id);
      if (!removed.ok) {
        this.#fail(REMOVE_FAILED, describeLibraryError(removed.error));
        return 'failed';
      }
    } finally {
      this.#state = NO_CHANGE;
    }

    await this.#library.load();
    return 'changed';
  }

  async edit(id: BookId, edit: BookEdit): Promise<ChangeOutcome> {
    if (this.#blocked()) return 'skipped';
    this.#state = { kind: 'editing', id };

    try {
      const edited = await this.#container.library.editBook(id, edit);
      if (!edited.ok) {
        this.#fail(EDIT_FAILED, describeLibraryError(edited.error));
        return 'failed';
      }
    } finally {
      this.#state = NO_CHANGE;
    }

    await this.#library.load();
    return 'changed';
  }

  async markFinished(id: BookId, shelf: Shelf): Promise<void> {
    await this.#markOn(id, shelf, 'finished');
  }

  async markUnread(id: BookId, shelf: Shelf): Promise<void> {
    await this.#markOn(id, shelf, 'unread');
  }

  #blocked(): boolean {
    return this.#state.kind !== 'idle' || this.#uploading();
  }

  async #markOn(id: BookId, shelf: Shelf, mark: Mark): Promise<void> {
    const before = this.#library.books.find((held) => held.id === id);
    const marked = await this.#mark(id, mark === 'finished' ? FINISH_FAILED : UNREAD_FAILED, () =>
      mark === 'finished'
        ? this.#container.library.markFinished(id)
        : this.#container.library.markUnread(id),
    );
    if (marked === null || before === undefined) return;
    if (!onShelf(before, shelf) || onShelf(marked, shelf)) return;

    this.#notify({
      tone: 'success',
      title: markedTitle(mark, marked),
      action: { label: 'Undo', run: () => void this.#undoMark(before) },
      duration: ACTION_NOTICE_MS,
    });
  }

  async #undoMark(before: Book): Promise<void> {
    await this.#mark(before.id, UNDO_MARK_FAILED, () =>
      this.#container.library.editBook(before.id, {
        finishedAt: before.finishedAt,
        position: before.position,
      }),
    );
  }

  async #mark(
    id: BookId,
    failed: string,
    run: () => Promise<Result<Book, LibraryError>>,
  ): Promise<Book | null> {
    if (this.#blocked()) return null;
    this.#state = { kind: 'editing', id };

    let marked: Book;
    try {
      const changed = await run();
      if (!changed.ok) {
        this.#fail(failed, describeLibraryError(changed.error));
        return null;
      }
      marked = changed.value;
    } finally {
      this.#state = NO_CHANGE;
    }

    await this.#library.load();
    return marked;
  }

  #fail(title: string, message: string): void {
    this.#notify({ tone: 'danger', title, message });
  }
}

export { BookChanges, EDIT_FAILED, FINISH_FAILED, REMOVE_FAILED, UNDO_MARK_FAILED, UNREAD_FAILED };
export type { BookChange, ChangeOutcome };
