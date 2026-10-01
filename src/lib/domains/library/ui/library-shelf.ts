import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import { effectiveDirection } from '$lib/shared/layout-kind';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { ReadState } from '$lib/shared/read-state';
import type { Book } from '../domain/book/book';

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
  readonly reload: () => void;
};

const EMPTY_SHELF: LibraryShelf = { books: [], covers: new Map(), storedBytes: null };

function shelfOf(state: ReadState<LibraryShelf>): LibraryShelf {
  return state.kind === 'ready' ? state.value : EMPTY_SHELF;
}

function failureOf(state: ReadState<LibraryShelf>): string | null {
  if (state.kind === 'failed') return state.message;
  if (state.kind === 'ready' && state.refresh.kind === 'failed') return state.refresh.message;
  return null;
}

function shelfState(
  books: ReadState<readonly Book[]>,
  covers: ReadonlyMap<BookId, string>,
  storedBytes: number | null,
): ReadState<LibraryShelf> {
  return match(books)
    .with({ kind: 'loading' }, { kind: 'failed' }, (unread): ReadState<LibraryShelf> => unread)
    .with({ kind: 'ready' }, (ready): ReadState<LibraryShelf> => ({
      ...ready,
      value: { books: ready.value, covers, storedBytes },
    }))
    .exhaustive();
}

function imageCountsOf(books: readonly Book[]): ReadonlyMap<BookId, number> {
  return new Map(books.map((held) => [held.id, held.imageCount]));
}

function listedOf(book: Book): ListedBook {
  return {
    id: book.id,
    title: book.title,
    language: book.language,
    direction: effectiveDirection(book.direction, book.layoutKind),
  };
}

function libraryBody(state: ReadState<LibraryShelf>, importing: boolean): LibraryBody {
  const nothing = shelfOf(state).books.length === 0 && !importing;
  return match(state)
    .with({ kind: 'loading' }, (): LibraryBody => (nothing ? 'reading' : 'listed'))
    .with({ kind: 'failed' }, (): LibraryBody => 'failed')
    .with({ kind: 'ready', refresh: { kind: 'settled' } }, (): LibraryBody =>
      nothing ? 'empty' : 'listed',
    )
    .with({ kind: 'ready', refresh: { kind: 'refreshing' } }, (): LibraryBody =>
      nothing ? 'reading' : 'listed',
    )
    .with({ kind: 'ready', refresh: { kind: 'failed' } }, (): LibraryBody => 'failed')
    .exhaustive();
}

export { EMPTY_SHELF, failureOf, imageCountsOf, libraryBody, listedOf, shelfOf, shelfState };
export type { LibraryBody, LibraryShelf, ListedBook, ShelfRead };
