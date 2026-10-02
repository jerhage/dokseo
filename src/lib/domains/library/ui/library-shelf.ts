import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import { effectiveDirection } from '$lib/shared/layout-kind';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { ReadState } from '$lib/shared/read-state';
import { shownTitle } from '$lib/shared/shown-title';
import type { Book } from '../domain/book/book';
import type { RemovedBook, RemovedShelf } from '../domain/book/removed-book';
import type { UnreadableBook } from '../domain/book/stored-book';
import { LIBRARY_UNAVAILABLE } from '../queries/library-error-text';
import type { ListBooksResult } from '../use-cases/list-books';

type LibraryBody = 'reading' | 'failed' | 'empty' | 'listed';

type LibraryShelf = {
  readonly books: readonly Book[];
  readonly covers: ReadonlyMap<BookId, string>;
  readonly storedBytes: number | null;
};

type ListedBook = {
  readonly id: BookId;
  readonly title: string;
  readonly language: Language;
  readonly direction: ReadingDirection;
};

type ShelfRead = {
  readonly state: ReadState<LibraryShelf>;
  readonly books: readonly Book[];
  readonly covers: ReadonlyMap<BookId, string>;
  readonly storedBytes: number | null;
  readonly failure: string | null;
  readonly searched: readonly ListedBook[];
  readonly counts: ReadonlyMap<BookId, number>;
  readonly unreadable: readonly UnreadableBook[];
  readonly removed: readonly RemovedBook[];
  readonly reload: () => void;
};

const EMPTY_SHELF: LibraryShelf = { books: [], covers: new Map(), storedBytes: null };

function shelfOf(state: ReadState<LibraryShelf>): LibraryShelf {
  return state.kind === 'ready' ? state.value : EMPTY_SHELF;
}

function failureOf(state: ReadState<LibraryShelf>): string | null {
  return state.kind === 'failed' ? state.message : null;
}

function listedBooks(books: ReadState<ListBooksResult>): readonly Book[] {
  return books.kind === 'ready' && books.value.kind === 'success' ? books.value.books : [];
}

function unreadableBooks(books: ReadState<ListBooksResult>): readonly UnreadableBook[] {
  return books.kind === 'ready' && books.value.kind === 'success' ? books.value.unreadable : [];
}

function removedEntries(removed: ReadState<RemovedShelf>): readonly RemovedBook[] {
  return removed.kind === 'ready' && removed.value.kind === 'success' ? removed.value.books : [];
}

function shelfState(
  books: ReadState<ListBooksResult>,
  covers: ReadonlyMap<BookId, string>,
  storedBytes: number | null,
): ReadState<LibraryShelf> {
  return match(books)
    .with({ kind: 'loading' }, { kind: 'failed' }, (unread): ReadState<LibraryShelf> => unread)
    .with({ kind: 'ready', value: { kind: 'success' } }, ({ value }): ReadState<LibraryShelf> => ({
      kind: 'ready',
      value: { books: value.books, covers, storedBytes },
    }))
    .with(
      { kind: 'ready', value: { kind: 'storage-unavailable' } },
      (): ReadState<LibraryShelf> => ({ kind: 'failed', message: LIBRARY_UNAVAILABLE }),
    )
    .exhaustive();
}

function imageCountsOf(books: readonly Book[]): ReadonlyMap<BookId, number> {
  return new Map(books.map((held) => [held.id, held.imageCount]));
}

function listedOf(book: Book): ListedBook {
  return {
    id: book.id,
    title: shownTitle(book),
    language: book.language,
    direction: effectiveDirection(book.direction, book.layoutKind),
  };
}

function libraryBody(state: ReadState<LibraryShelf>, importing: boolean): LibraryBody {
  const nothing = shelfOf(state).books.length === 0 && !importing;
  return match(state)
    .with({ kind: 'loading' }, (): LibraryBody => (nothing ? 'reading' : 'listed'))
    .with({ kind: 'failed' }, (): LibraryBody => 'failed')
    .with({ kind: 'ready' }, (): LibraryBody => (nothing ? 'empty' : 'listed'))
    .exhaustive();
}

export {
  EMPTY_SHELF,
  failureOf,
  imageCountsOf,
  libraryBody,
  listedBooks,
  listedOf,
  removedEntries,
  shelfOf,
  shelfState,
  unreadableBooks,
};
export type { LibraryBody, LibraryShelf, ListedBook, ShelfRead };
