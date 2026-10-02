import { match } from 'ts-pattern';
import { knownStoredValue } from '$lib/shared/corrupt-row';
import { parsedBookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { isLanguage } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import { isLayoutKind, isPagePairing, isReadingDirection } from '$lib/shared/layout-kind';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { isPageFit } from '$lib/shared/page-fit';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { defaultPageFit, DEFAULT_PAGE_PAIRING, isSourceKind } from './book';
import type { Book } from './book';

const FALLBACK_LANGUAGE: Language = 'ja';

const FALLBACK_DIRECTION: ReadingDirection = 'rtl';

type StoredBook = Omit<
  Book,
  'language' | 'layoutKind' | 'direction' | 'sourceKind' | 'pagePairing' | 'pageFit'
> & {
  readonly language: unknown;
  readonly layoutKind: unknown;
  readonly direction: unknown;
  readonly sourceKind: unknown;
  readonly pagePairing: unknown;
  readonly pageFit: unknown;
};

type UnreadableBook = { readonly id: BookId; readonly title: string | null };

type StoredBooks = {
  readonly books: readonly Book[];
  readonly unreadable: readonly UnreadableBook[];
};

type RawRow = { readonly id?: unknown; readonly title?: unknown };

function storedPlace(position: ReadingPlace): ReadingPlace {
  return match(position)
    .with({ kind: 'image' }, (at) => imagePlace(at.index, at.shownThrough, at.offset))
    .with({ kind: 'text' }, (at) => textPlace(at.cfi, at.fraction))
    .exhaustive();
}

function bookFromStored(stored: StoredBook): Book {
  const layoutKind = knownStoredValue('book', 'layout kind', stored.layoutKind, isLayoutKind);
  return {
    ...stored,
    language: isLanguage(stored.language) ? stored.language : FALLBACK_LANGUAGE,
    layoutKind,
    direction: isReadingDirection(stored.direction) ? stored.direction : FALLBACK_DIRECTION,
    sourceKind: knownStoredValue('book', 'source kind', stored.sourceKind, isSourceKind),
    pagePairing: isPagePairing(stored.pagePairing) ? stored.pagePairing : DEFAULT_PAGE_PAIRING,
    pageFit: isPageFit(stored.pageFit) ? stored.pageFit : defaultPageFit(layoutKind),
    position: storedPlace(stored.position),
  };
}

function unreadableBook(row: RawRow, cause: unknown): UnreadableBook {
  const id = typeof row.id === 'string' ? parsedBookId(row.id) : null;
  if (id === null) throw cause;
  return { id, title: typeof row.title === 'string' ? row.title : null };
}

function booksFromStored(rows: readonly StoredBook[]): StoredBooks {
  const books: Book[] = [];
  const unreadable: UnreadableBook[] = [];
  for (const row of rows) {
    try {
      books.push(bookFromStored(row));
    } catch (cause) {
      unreadable.push(unreadableBook(row, cause));
    }
  }
  return { books, unreadable };
}

export { FALLBACK_DIRECTION, FALLBACK_LANGUAGE, bookFromStored, booksFromStored };
export type { StoredBook, StoredBooks, UnreadableBook };
