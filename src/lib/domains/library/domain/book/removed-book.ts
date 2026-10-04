import {
  CorruptRow,
  isNumber,
  isNumberOrNull,
  isText,
  knownStoredValue,
} from '$lib/shared/corrupt-row';
import { parsedBookId, seriesId } from '$lib/shared/ids';
import type { BookId, SeriesId } from '$lib/shared/ids';
import { isLanguage } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Book } from './book';
import { bookFromStored } from './stored-book';

type RemovedBook = Book & { readonly removedAt: number };

type StoredRemovedBook = { readonly [Field in keyof RemovedBook]?: unknown };

type RestoreCandidate = {
  readonly id: BookId;
  readonly title: string;
  readonly alias: string | null;
  readonly seriesId: SeriesId | null;
  readonly volume: number | null;
  readonly contentHash: string;
  readonly fileName: string;
  readonly addedAt: number | null;
};

type UnreadableRemovedBook = RestoreCandidate & {
  readonly language: Language | null;
  readonly stored: StoredRemovedBook;
};

type StoredRemovedBooks = {
  readonly removed: readonly RemovedBook[];
  readonly unreadable: readonly StoredRemovedBook[];
};

type RemovedShelf =
  | {
      readonly kind: 'success';
      readonly books: readonly RemovedBook[];
      readonly unreadable: readonly UnreadableRemovedBook[];
    }
  | StorageUnavailable;

type CapturesDeletion = { readonly kind: 'success' } | StorageUnavailable;

type RemovalWithCaptures =
  | { readonly kind: 'success' }
  | { readonly kind: 'partly-removed' }
  | StorageUnavailable;

type RetiredRow = {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly alias?: unknown;
  readonly seriesId?: unknown;
  readonly volume?: unknown;
  readonly contentHash?: unknown;
  readonly fileName?: unknown;
  readonly addedAt?: unknown;
};

const UNTITLED_BOOK = 'Untitled book';

function removedRecord(book: Book, removedAt: number): RemovedBook {
  return { ...book, removedAt };
}

function removedBookFromStored(stored: StoredRemovedBook): RemovedBook {
  const book = bookFromStored(stored);
  const removedAt = knownStoredValue('removed book', 'removed time', stored.removedAt, isNumber);
  return removedRecord(book, removedAt);
}

function removedBooksFromStored(rows: readonly StoredRemovedBook[]): StoredRemovedBooks {
  const removed: RemovedBook[] = [];
  const unreadable: StoredRemovedBook[] = [];
  for (const row of rows) {
    try {
      removed.push(removedBookFromStored(row));
    } catch (error) {
      if (!(error instanceof CorruptRow)) throw error;
      unreadable.push(row);
    }
  }
  return { removed, unreadable };
}

function textOf(value: unknown): string {
  return isText(value) ? value : '';
}

function titleOf(value: unknown): string {
  const title = textOf(value).trim();
  return title.length === 0 ? UNTITLED_BOOK : title;
}

function aliasOf(value: unknown): string | null {
  const alias = textOf(value).trim();
  return alias.length === 0 ? null : alias;
}

function seriesIdOf(value: unknown): SeriesId | null {
  return isText(value) && value.length > 0 ? seriesId(value) : null;
}

function volumeOf(value: unknown): number | null {
  return isNumberOrNull(value) ? value : null;
}

function restoreCandidateFrom(row: RetiredRow): RestoreCandidate | null {
  const id = isText(row.id) ? parsedBookId(row.id) : null;
  if (id === null) return null;
  return {
    id,
    title: titleOf(row.title),
    alias: aliasOf(row.alias),
    seriesId: seriesIdOf(row.seriesId),
    volume: volumeOf(row.volume),
    contentHash: textOf(row.contentHash),
    fileName: textOf(row.fileName),
    addedAt: isNumber(row.addedAt) ? row.addedAt : null,
  };
}

function restoreCandidatesFrom(rows: readonly RetiredRow[]): readonly RestoreCandidate[] {
  return rows.flatMap((row) => {
    const candidate = restoreCandidateFrom(row);
    return candidate === null ? [] : [candidate];
  });
}

function unreadableRemovedBooksFrom(
  rows: readonly StoredRemovedBook[],
): readonly UnreadableRemovedBook[] {
  return rows.flatMap((stored) => {
    const candidate = restoreCandidateFrom(stored);
    if (candidate === null) return [];
    const language = isLanguage(stored.language) ? stored.language : null;
    return [{ ...candidate, language, stored }];
  });
}

export {
  UNTITLED_BOOK,
  removedBookFromStored,
  removedBooksFromStored,
  removedRecord,
  restoreCandidateFrom,
  restoreCandidatesFrom,
  unreadableRemovedBooksFrom,
};
export type {
  CapturesDeletion,
  RemovalWithCaptures,
  RemovedBook,
  RemovedShelf,
  RestoreCandidate,
  RetiredRow,
  StoredRemovedBook,
  StoredRemovedBooks,
  UnreadableRemovedBook,
};
