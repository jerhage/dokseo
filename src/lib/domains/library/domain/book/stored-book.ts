import { match } from 'ts-pattern';
import {
  CorruptRow,
  isNumber,
  isNumberOrNull,
  isStoredFields,
  isText,
  isTextOrNull,
  knownStoredValue,
} from '$lib/shared/corrupt-row';
import { contentHash, imageIndex, parsedBookId } from '$lib/shared/ids';
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

type StoredBook = { readonly [Field in keyof Book]?: unknown };

type UnreadableBook = {
  readonly id: BookId;
  readonly title: string | null;
  readonly alias: string | null;
};

type StoredBooks = {
  readonly books: readonly Book[];
  readonly unreadable: readonly UnreadableBook[];
};

type RawRow = { readonly id?: unknown; readonly title?: unknown; readonly alias?: unknown };

function bookField<T>(field: string, value: unknown, known: (value: unknown) => value is T): T {
  return knownStoredValue('book', field, value, known);
}

function storedBookId(value: unknown): BookId {
  const id = isText(value) ? parsedBookId(value) : null;
  if (id === null) throw new CorruptRow('book', 'id', value);
  return id;
}

function storedAlias(value: unknown): string | null {
  return value === undefined ? null : bookField('alias', value, isTextOrNull);
}

function storedPlace(value: unknown): ReadingPlace {
  const position = bookField('position', value, isStoredFields);
  return match(position.kind)
    .with('image', () =>
      imagePlace(
        imageIndex(bookField('position index', position.index, isNumber)),
        imageIndex(bookField('last image shown', position.shownThrough, isNumber)),
        bookField('position offset', position.offset, isNumber),
      ),
    )
    .with('text', () =>
      textPlace(
        bookField('position cfi', position.cfi, isText),
        bookField('position fraction', position.fraction, isNumberOrNull),
      ),
    )
    .otherwise((kind) => {
      throw new CorruptRow('book', 'position kind', kind);
    });
}

function bookFromStored(stored: StoredBook): Book {
  const layoutKind = bookField('layout kind', stored.layoutKind, isLayoutKind);
  return {
    id: storedBookId(stored.id),
    title: bookField('title', stored.title, isText),
    alias: storedAlias(stored.alias),
    language: isLanguage(stored.language) ? stored.language : FALLBACK_LANGUAGE,
    layoutKind,
    direction: isReadingDirection(stored.direction) ? stored.direction : FALLBACK_DIRECTION,
    pagePairing: isPagePairing(stored.pagePairing) ? stored.pagePairing : DEFAULT_PAGE_PAIRING,
    pageFit: isPageFit(stored.pageFit) ? stored.pageFit : defaultPageFit(layoutKind),
    sourceKind: bookField('source kind', stored.sourceKind, isSourceKind),
    contentHash: contentHash(bookField('content hash', stored.contentHash, isText)),
    fileName: bookField('file name', stored.fileName, isText),
    imageCount: bookField('image count', stored.imageCount, isNumber),
    addedAt: bookField('added time', stored.addedAt, isNumber),
    position: storedPlace(stored.position),
    lastReadAt: bookField('last read time', stored.lastReadAt, isNumberOrNull),
    finishedAt: bookField('finished time', stored.finishedAt, isNumberOrNull),
  };
}

function unreadableBook(row: RawRow, cause: unknown): UnreadableBook {
  const id = typeof row.id === 'string' ? parsedBookId(row.id) : null;
  if (id === null) throw cause;
  return {
    id,
    title: typeof row.title === 'string' ? row.title : null,
    alias: typeof row.alias === 'string' ? row.alias : null,
  };
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
