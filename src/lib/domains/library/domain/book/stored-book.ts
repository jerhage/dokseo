import { match } from 'ts-pattern';
import {
  CorruptRow,
  isFraction,
  isFractionOrNull,
  isNumber,
  isNumberOrNull,
  isStoredFields,
  isText,
  isTextOrNull,
  isWholeNumber,
  knownStoredValue,
} from '$lib/shared/corrupt-row';
import type { StoredFields } from '$lib/shared/corrupt-row';
import { imageIndex, parsedBookId, parsedContentHash, seriesId } from '$lib/shared/ids';
import type { BookId, ContentHash, SeriesId } from '$lib/shared/ids';
import { isLanguage } from '$lib/shared/language';
import { isLayoutKind, isPagePairingChoice, isReadingDirection } from '$lib/shared/layout-kind';
import type { LayoutKind } from '$lib/shared/layout-kind';
import { isPageFit } from '$lib/shared/page-fit';
import { imagePlace, textPlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { isSourceKind, sourceFitsLayout } from './book';
import type { Book, SourceKind } from './book';

type StoredBook = { readonly [Field in keyof Book]?: unknown };

type UnreadableBook = {
  readonly id: BookId;
  readonly title: string | null;
  readonly alias: string | null;
  readonly contentHash: string;
  readonly fileName: string;
  readonly stored: StoredBook;
};

type StoredBooks = {
  readonly books: readonly Book[];
  readonly unreadable: readonly UnreadableBook[];
};

type StoredBookRead =
  | { readonly kind: 'readable'; readonly book: Book }
  | { readonly kind: 'unreadable'; readonly book: UnreadableBook };

function bookField<T>(field: string, value: unknown, known: (value: unknown) => value is T): T {
  return knownStoredValue('book', field, value, known);
}

function storedBookId(value: unknown): BookId {
  const id = isText(value) ? parsedBookId(value) : null;
  if (id === null) throw new CorruptRow('book', 'id', value);
  return id;
}

function storedContentHash(value: unknown): ContentHash {
  const hash = isText(value) ? parsedContentHash(value) : null;
  if (hash === null) throw new CorruptRow('book', 'content hash', value);
  return hash;
}

function isSeriesIdOrNull(value: unknown): value is string | null {
  return value === null || (isText(value) && value.length > 0);
}

function storedSeriesId(value: unknown): SeriesId | null {
  const stored = bookField('series id', value, isSeriesIdOrNull);
  return stored === null ? null : seriesId(stored);
}

function storedSourceKind(value: unknown, layoutKind: LayoutKind): SourceKind {
  const sourceKind = bookField('source kind', value, isSourceKind);
  if (!sourceFitsLayout(layoutKind, sourceKind)) {
    throw new CorruptRow('book', `source kind for a ${layoutKind} book`, sourceKind);
  }
  return sourceKind;
}

function placeKindOf(layoutKind: LayoutKind): ReadingPlace['kind'] {
  return match(layoutKind)
    .returnType<ReadingPlace['kind']>()
    .with('paged', 'continuous', () => 'image')
    .with('flow', () => 'text')
    .exhaustive();
}

function storedImagePlace(position: StoredFields): ReadingPlace {
  const index = bookField('position index', position.index, isWholeNumber);
  const shownThrough = bookField('last image shown', position.shownThrough, isWholeNumber);
  if (shownThrough < index) throw new CorruptRow('book', 'last image shown', shownThrough);
  return imagePlace(
    imageIndex(index),
    imageIndex(shownThrough),
    bookField('position offset', position.offset, isFraction),
  );
}

function storedTextPlace(position: StoredFields): ReadingPlace {
  return textPlace(
    bookField('position cfi', position.cfi, isText),
    bookField('position fraction', position.fraction, isFractionOrNull),
  );
}

function storedPlace(value: unknown, layoutKind: LayoutKind): ReadingPlace {
  const position = bookField('position', value, isStoredFields);
  const place = match(position.kind)
    .with('image', () => storedImagePlace(position))
    .with('text', () => storedTextPlace(position))
    .otherwise((kind) => {
      throw new CorruptRow('book', 'position kind', kind);
    });
  if (place.kind !== placeKindOf(layoutKind)) {
    throw new CorruptRow('book', `position kind for a ${layoutKind} book`, place.kind);
  }
  return place;
}

function bookFromStored(stored: StoredBook): Book {
  const layoutKind = bookField('layout kind', stored.layoutKind, isLayoutKind);
  return {
    id: storedBookId(stored.id),
    title: bookField('title', stored.title, isText),
    alias: bookField('alias', stored.alias, isTextOrNull),
    seriesId: storedSeriesId(stored.seriesId),
    volume: bookField('volume', stored.volume, isNumberOrNull),
    language: bookField('language', stored.language, isLanguage),
    layoutKind,
    direction: bookField('direction', stored.direction, isReadingDirection),
    pagePairing: bookField('page pairing', stored.pagePairing, isPagePairingChoice),
    pageFit: bookField('page fit', stored.pageFit, isPageFit),
    sourceKind: storedSourceKind(stored.sourceKind, layoutKind),
    contentHash: storedContentHash(stored.contentHash),
    fileName: bookField('file name', stored.fileName, isText),
    imageCount: bookField('image count', stored.imageCount, isWholeNumber),
    addedAt: bookField('added time', stored.addedAt, isNumber),
    position: storedPlace(stored.position, layoutKind),
    lastReadAt: bookField('last read time', stored.lastReadAt, isNumberOrNull),
    finishedAt: bookField('finished time', stored.finishedAt, isNumberOrNull),
  };
}

function unreadableBook(row: StoredBook, cause: unknown): UnreadableBook {
  const id = typeof row.id === 'string' ? parsedBookId(row.id) : null;
  if (id === null) throw cause;
  return {
    id,
    title: typeof row.title === 'string' ? row.title : null,
    alias: typeof row.alias === 'string' ? row.alias : null,
    contentHash: typeof row.contentHash === 'string' ? row.contentHash : '',
    fileName: typeof row.fileName === 'string' ? row.fileName : '',
    stored: row,
  };
}

function storedBookRead(row: StoredBook): StoredBookRead {
  try {
    const book = bookFromStored(row);
    return { kind: 'readable', book };
  } catch (cause) {
    return { kind: 'unreadable', book: unreadableBook(row, cause) };
  }
}

function booksFromStored(rows: readonly StoredBook[]): StoredBooks {
  const books: Book[] = [];
  const unreadable: UnreadableBook[] = [];
  for (const row of rows) {
    const read = storedBookRead(row);
    if (read.kind === 'readable') books.push(read.book);
    else unreadable.push(read.book);
  }
  return { books, unreadable };
}

export { bookFromStored, booksFromStored, storedBookRead };
export type { StoredBook, StoredBookRead, StoredBooks, UnreadableBook };
