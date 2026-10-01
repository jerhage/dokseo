import { useQueryClient } from '@tanstack/svelte-query';
import type { BookId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { Book, BookEdit } from '../domain/book/book';
import { editBookMutation, markBookMutation, removeBookMutation } from '../queries/library-queries';
import type { BookMark, EditRequest, LibraryWrites, MarkRequest } from '../queries/library-queries';
import { refreshLibrary } from './library-refresh';
import { onShelf } from './library-shelves';
import type { Shelf } from './library-shelves';

type ChangeOutcome = 'changed' | 'failed' | 'skipped';

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

function markedTitle(mark: BookMark, book: Book): string {
  return mark === 'finished' ? `Marked ${book.title} finished` : `Marked ${book.title} unread`;
}

function undoOffer(
  mark: BookMark,
  before: Book | undefined,
  marked: Book,
  shelf: Shelf,
): string | null {
  if (before === undefined) return null;
  if (!onShelf(before, shelf) || onShelf(marked, shelf)) return null;
  return markedTitle(mark, marked);
}

function markFailedTitle(mark: BookMark): string {
  return mark === 'finished' ? FINISH_FAILED : UNREAD_FAILED;
}

class BookChanges {
  #state = $state.raw<BookChange>(NO_CHANGE);
  #notify: Notify;
  #uploading: () => boolean;
  #removal: WriteQuery<void, BookId>;
  #editing: WriteQuery<Book, EditRequest>;
  #marking: WriteQuery<Book, MarkRequest>;
  #undoing: WriteQuery<Book, EditRequest>;

  constructor(library: LibraryWrites, notify: Notify, uploading: () => boolean) {
    const client = useQueryClient();
    this.#notify = notify;
    this.#uploading = uploading;
    this.#removal = writeQuery(() => ({
      ...removeBookMutation(library),
      onSuccess: () => refreshLibrary(client),
      onError: (cause) => this.#fail(REMOVE_FAILED, cause),
    }));
    this.#editing = writeQuery(() => ({
      ...editBookMutation(library),
      onSuccess: () => refreshLibrary(client),
      onError: (cause) => this.#fail(EDIT_FAILED, cause),
    }));
    this.#marking = writeQuery(() => ({
      ...markBookMutation(library),
      onSuccess: () => refreshLibrary(client),
      onError: (cause, { mark }) => this.#fail(markFailedTitle(mark), cause),
    }));
    this.#undoing = writeQuery(() => ({
      ...editBookMutation(library),
      onSuccess: () => refreshLibrary(client),
      onError: (cause) => this.#fail(UNDO_MARK_FAILED, cause),
    }));
  }

  get removing(): BookId | null {
    return this.#state.kind === 'removing' ? this.#state.id : null;
  }

  get editing(): BookId | null {
    return this.#state.kind === 'editing' ? this.#state.id : null;
  }

  async remove(id: BookId): Promise<ChangeOutcome> {
    if (this.#blocked()) return 'skipped';
    const removed = await this.#change({ kind: 'removing', id }, () => this.#removal.run(id));
    return removed === null ? 'failed' : 'changed';
  }

  async edit(id: BookId, edit: BookEdit): Promise<ChangeOutcome> {
    if (this.#blocked()) return 'skipped';
    const edited = await this.#change({ kind: 'editing', id }, () =>
      this.#editing.run({ id, edit }),
    );
    return edited === null ? 'failed' : 'changed';
  }

  async markFinished(id: BookId, shelf: Shelf, books: readonly Book[]): Promise<void> {
    await this.#markOn(id, shelf, books, 'finished');
  }

  async markUnread(id: BookId, shelf: Shelf, books: readonly Book[]): Promise<void> {
    await this.#markOn(id, shelf, books, 'unread');
  }

  #blocked(): boolean {
    return this.#state.kind !== 'idle' || this.#uploading();
  }

  async #markOn(id: BookId, shelf: Shelf, books: readonly Book[], mark: BookMark): Promise<void> {
    if (this.#blocked()) return;
    const before = books.find((held) => held.id === id);
    const marked = await this.#change({ kind: 'editing', id }, () =>
      this.#marking.run({ id, mark }),
    );
    if (marked === null || before === undefined) return;
    const title = undoOffer(mark, before, marked.value, shelf);
    if (title === null) return;

    this.#notify({
      tone: 'success',
      title,
      action: { label: 'Undo', run: () => void this.#undoMark(before) },
      duration: ACTION_NOTICE_MS,
    });
  }

  async #undoMark(before: Book): Promise<void> {
    if (this.#blocked()) return;
    const edit = { finishedAt: before.finishedAt, position: before.position };
    await this.#change({ kind: 'editing', id: before.id }, () =>
      this.#undoing.run({ id: before.id, edit }),
    );
  }

  async #change<R>(
    change: BookChange,
    run: () => Promise<R>,
  ): Promise<{ readonly value: R } | null> {
    this.#state = change;
    try {
      const value = await run();
      return { value };
    } catch {
      return null;
    } finally {
      this.#state = NO_CHANGE;
    }
  }

  #fail(title: string, cause: unknown): void {
    this.#notify({ tone: 'danger', title, message: failureMessage(cause) });
  }
}

export {
  BookChanges,
  EDIT_FAILED,
  FINISH_FAILED,
  REMOVE_FAILED,
  UNDO_MARK_FAILED,
  UNREAD_FAILED,
  markFailedTitle,
  undoOffer,
};
export type { BookChange, ChangeOutcome };
