import { useQueryClient } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notice, Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { shownTitle } from '$lib/shared/shown-title';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { Book, BookEdit } from '../domain/book/book';
import type { BookMerge } from '../domain/book/book-merge';
import type { RemovalWithCaptures } from '../domain/book/removed-book';
import { describeLibraryRefusal } from '../queries/library-error-text';
import type { LibraryRefusal } from '../queries/library-error-text';
import {
  editBookMutation,
  markBookMutation,
  mergeIntoBookMutation,
  removeBookAndCapturesMutation,
  removeBookMutation,
} from '../queries/library-queries';
import type {
  BookMark,
  EditRequest,
  LibraryWrites,
  MarkRequest,
  MergeRequest,
} from '../queries/library-queries';
import type { EditBookResult } from '../use-cases/edit-book';
import type { MarkFinishedResult } from '../use-cases/mark-finished';
import type { MarkUnreadResult } from '../use-cases/mark-unread';
import type { RemoveBookResult } from '../use-cases/remove-book';
import { refreshLibrary } from './library-refresh';
import { onShelf } from './library-shelves';
import type { Shelf } from './library-shelves';

type ChangeOutcome = 'changed' | 'failed' | 'skipped';

type BookChange =
  | { readonly kind: 'idle' }
  | { readonly kind: 'removing'; readonly id: BookId }
  | { readonly kind: 'merging'; readonly id: BookId }
  | { readonly kind: 'editing'; readonly id: BookId };

const NO_CHANGE: BookChange = { kind: 'idle' };

const EDIT_FAILED = 'Could not save the book settings';

const REMOVE_FAILED = 'Could not remove that book';

const CAPTURES_LEFT = 'Removed that book, but not all of its captures';

const CAPTURES_LEFT_ADVICE = 'It is listed under Removed books, where Delete captures finishes it.';

const MERGE_FAILED = 'Could not merge that book';

const MERGED_ADVICE = 'Its captures were moved onto it.';

const MERGE_LEFT = 'Moved its captures, but could not clear the unreadable book';

const MERGE_LEFT_ADVICE = 'Merge it again to finish.';

const FINISH_FAILED = 'Could not mark that book finished';

const UNREAD_FAILED = 'Could not mark that book unread';

const UNDO_MARK_FAILED = 'Could not undo that change';

function markedTitle(mark: BookMark, book: Book): string {
  return mark === 'finished'
    ? `Marked ${shownTitle(book)} finished`
    : `Marked ${shownTitle(book)} unread`;
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

function mergeNotice(merged: BookMerge, into: Book): Notice {
  return match(merged)
    .returnType<Notice>()
    .with({ kind: 'merged' }, () => ({
      tone: 'success',
      title: `Merged into ${shownTitle(into)}`,
      message: MERGED_ADVICE,
    }))
    .with({ kind: 'partly-merged' }, () => ({
      tone: 'warning',
      title: MERGE_LEFT,
      message: MERGE_LEFT_ADVICE,
    }))
    .with({ kind: 'storage-unavailable' }, (refusal) => ({
      tone: 'danger',
      title: MERGE_FAILED,
      message: describeLibraryRefusal(refusal),
    }))
    .exhaustive();
}

function markFailedTitle(mark: BookMark): string {
  return mark === 'finished' ? FINISH_FAILED : UNREAD_FAILED;
}

class BookChanges {
  #state = $state.raw<BookChange>(NO_CHANGE);
  #notify: Notify;
  #uploading: () => boolean;
  #removal: WriteQuery<RemoveBookResult, BookId>;
  #removalWithCaptures: WriteQuery<RemovalWithCaptures, BookId>;
  #merging: WriteQuery<BookMerge, MergeRequest>;
  #editing: WriteQuery<EditBookResult, EditRequest>;
  #marking: WriteQuery<MarkFinishedResult | MarkUnreadResult, MarkRequest>;
  #undoing: WriteQuery<EditBookResult, EditRequest>;

  constructor(library: LibraryWrites, notify: Notify, uploading: () => boolean) {
    const client = useQueryClient();
    this.#notify = notify;
    this.#uploading = uploading;
    this.#removal = writeQuery(() => ({
      ...removeBookMutation(library),
      onSettled: () => refreshLibrary(client),
      onError: (cause) => this.#fail(REMOVE_FAILED, failureMessage(cause)),
    }));
    this.#removalWithCaptures = writeQuery(() => ({
      ...removeBookAndCapturesMutation(library),
      onSettled: () => refreshLibrary(client),
      onError: (cause) => this.#fail(REMOVE_FAILED, failureMessage(cause)),
    }));
    this.#merging = writeQuery(() => ({
      ...mergeIntoBookMutation(library),
      onSettled: () => refreshLibrary(client),
      onError: (cause) => this.#fail(MERGE_FAILED, failureMessage(cause)),
    }));
    this.#editing = writeQuery(() => ({
      ...editBookMutation(library),
      onSettled: () => refreshLibrary(client),
      onError: (cause) => this.#fail(EDIT_FAILED, failureMessage(cause)),
    }));
    this.#marking = writeQuery(() => ({
      ...markBookMutation(library),
      onSettled: () => refreshLibrary(client),
      onError: (cause, { mark }) => this.#fail(markFailedTitle(mark), failureMessage(cause)),
    }));
    this.#undoing = writeQuery(() => ({
      ...editBookMutation(library),
      onSettled: () => refreshLibrary(client),
      onError: (cause) => this.#fail(UNDO_MARK_FAILED, failureMessage(cause)),
    }));
  }

  get removing(): BookId | null {
    return this.#state.kind === 'removing' ? this.#state.id : null;
  }

  get merging(): BookId | null {
    return this.#state.kind === 'merging' ? this.#state.id : null;
  }

  get editing(): BookId | null {
    return this.#state.kind === 'editing' ? this.#state.id : null;
  }

  async remove(id: BookId): Promise<ChangeOutcome> {
    if (this.#blocked()) return 'skipped';
    const removed = await this.#change({ kind: 'removing', id }, REMOVE_FAILED, () =>
      this.#removal.run(id),
    );
    return removed === null ? 'failed' : 'changed';
  }

  async removeWithCaptures(id: BookId): Promise<ChangeOutcome> {
    if (this.#blocked()) return 'skipped';
    this.#state = { kind: 'removing', id };
    try {
      const removed = await this.#removalWithCaptures.run(id);
      return match(removed)
        .with({ kind: 'success' }, (): ChangeOutcome => 'changed')
        .with({ kind: 'partly-removed' }, (): ChangeOutcome => {
          this.#notify({ tone: 'warning', title: CAPTURES_LEFT, message: CAPTURES_LEFT_ADVICE });
          return 'changed';
        })
        .with({ kind: 'storage-unavailable' }, (refusal): ChangeOutcome => {
          this.#fail(REMOVE_FAILED, describeLibraryRefusal(refusal));
          return 'failed';
        })
        .exhaustive();
    } catch {
      return 'failed';
    } finally {
      this.#state = NO_CHANGE;
    }
  }

  async merge(stray: BookId, into: Book): Promise<ChangeOutcome> {
    if (this.#blocked()) return 'skipped';
    this.#state = { kind: 'merging', id: stray };
    try {
      const merged = await this.#merging.run({ into: into.id, stray });
      this.#notify(mergeNotice(merged, into));
      return merged.kind === 'storage-unavailable' ? 'failed' : 'changed';
    } catch {
      return 'failed';
    } finally {
      this.#state = NO_CHANGE;
    }
  }

  async removeEach(ids: readonly BookId[]): Promise<ChangeOutcome> {
    for (const id of ids) {
      const outcome = await this.remove(id);
      if (outcome !== 'changed') return outcome;
    }
    return 'changed';
  }

  async edit(id: BookId, edit: BookEdit): Promise<ChangeOutcome> {
    if (this.#blocked()) return 'skipped';
    const edited = await this.#change({ kind: 'editing', id }, EDIT_FAILED, () =>
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
    const marked = await this.#change({ kind: 'editing', id }, markFailedTitle(mark), () =>
      this.#marking.run({ id, mark }),
    );
    if (marked === null || before === undefined) return;
    const title = undoOffer(mark, before, marked.book, shelf);
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
    await this.#change({ kind: 'editing', id: before.id }, UNDO_MARK_FAILED, () =>
      this.#undoing.run({ id: before.id, edit }),
    );
  }

  async #change<S extends { readonly kind: 'success' }>(
    change: BookChange,
    title: string,
    run: () => Promise<S | LibraryRefusal>,
  ): Promise<S | null> {
    this.#state = change;
    try {
      const changed = await run();
      if (changed.kind === 'success') return changed;
      this.#fail(title, describeLibraryRefusal(changed));
      return null;
    } catch {
      return null;
    } finally {
      this.#state = NO_CHANGE;
    }
  }

  #fail(title: string, message: string): void {
    this.#notify({ tone: 'danger', title, message });
  }
}

export {
  BookChanges,
  CAPTURES_LEFT,
  CAPTURES_LEFT_ADVICE,
  EDIT_FAILED,
  FINISH_FAILED,
  MERGED_ADVICE,
  MERGE_FAILED,
  MERGE_LEFT,
  MERGE_LEFT_ADVICE,
  REMOVE_FAILED,
  UNDO_MARK_FAILED,
  UNREAD_FAILED,
  markFailedTitle,
  mergeNotice,
  undoOffer,
};
export type { BookChange, ChangeOutcome };
