import type { Book } from '$lib/domains/library/domain/book/book';
import type {
  RemovedBook,
  UnreadableRemovedBook,
} from '$lib/domains/library/domain/book/removed-book';
import type { StoredBook, UnreadableBook } from '$lib/domains/library/domain/book/stored-book';
import type { Capture, UnreadableCapture } from '$lib/domains/recognition/domain/capture/capture';
import type { Tag, UnreadableTag } from '$lib/domains/recognition/domain/tag/tag';
import type { BookId, CaptureId } from '$lib/shared/ids';
import { CAPTURES_FILE_FORMAT, CAPTURES_FILE_VERSION } from './captures-file';
import type {
  CapturesFile,
  FileBook,
  FileCapture,
  RetiredFileBook,
  UnreadableSection,
} from './captures-file';
import { jsonSafe } from './json-safe';

type CapturesFileContents = {
  readonly books: readonly Book[];
  readonly removedBooks: readonly RemovedBook[];
  readonly unreadableRemovedBooks: readonly UnreadableRemovedBook[];
  readonly unreadableBooks: readonly UnreadableBook[];
  readonly tags: readonly Tag[];
  readonly unreadableTags: readonly UnreadableTag[];
  readonly captures: readonly Capture[];
  readonly unreadableCaptures: readonly UnreadableCapture[];
  readonly exportedAt: number;
  readonly appVersion: string;
};

type BuiltCapturesFile = {
  readonly file: CapturesFile;
  readonly json: string;
  readonly bookless: readonly CaptureId[];
};

type WrittenFields = Omit<FileBook, 'key'> | Omit<RetiredFileBook, 'key'>;

type RetiredBook = {
  readonly id: BookId;
  readonly title: string | null;
  readonly stored: StoredBook;
};

type StoredRow = { readonly id: string; readonly stored: unknown };

type BookIdentity = {
  readonly id: BookId;
  readonly title: string;
  readonly fields: WrittenFields;
};

function byCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}

function bookIdentity(book: Book): BookIdentity {
  return {
    id: book.id,
    title: book.title,
    fields: {
      contentHash: book.contentHash,
      fileName: book.fileName,
      title: book.title,
      alias: book.alias,
      seriesId: book.seriesId,
      volume: book.volume,
      language: book.language,
      direction: book.direction,
      layoutKind: book.layoutKind,
      sourceKind: book.sourceKind,
      imageCount: book.imageCount,
    },
  };
}

function retiredIdentity(book: RetiredBook): BookIdentity {
  const { stored } = book;
  return {
    id: book.id,
    title: book.title ?? '',
    fields: {
      contentHash: stored.contentHash,
      fileName: stored.fileName,
      title: stored.title,
      alias: stored.alias,
      seriesId: stored.seriesId,
      volume: stored.volume,
      language: stored.language,
      direction: stored.direction,
      layoutKind: stored.layoutKind,
      sourceKind: stored.sourceKind,
      imageCount: stored.imageCount,
    },
  };
}

function identities(contents: CapturesFileContents): ReadonlyMap<BookId, BookIdentity> {
  const known = new Map<BookId, BookIdentity>();
  for (const retired of contents.unreadableBooks) known.set(retired.id, retiredIdentity(retired));
  for (const retired of contents.unreadableRemovedBooks) {
    known.set(retired.id, retiredIdentity(retired));
  }
  for (const removed of contents.removedBooks) known.set(removed.id, bookIdentity(removed));
  for (const book of contents.books) known.set(book.id, bookIdentity(book));
  return known;
}

function byTitleThenId(left: BookIdentity, right: BookIdentity): number {
  return byCodeUnits(left.title, right.title) || byCodeUnits(left.id, right.id);
}

function byCreationThenId<T extends { readonly id: string; readonly createdAt: number }>(
  left: T,
  right: T,
): number {
  return left.createdAt - right.createdAt || byCodeUnits(left.id, right.id);
}

function keyAt(index: number): string {
  return `book-${index + 1}`;
}

function keyed(identity: BookIdentity, key: string): FileBook | RetiredFileBook {
  return { key, ...identity.fields };
}

function fileCapture(capture: Capture, bookKey: string): FileCapture {
  const { bookId: _deviceId, ...bookless } = capture;
  return { ...bookless, bookKey };
}

function storedRows(rows: readonly StoredRow[]): readonly unknown[] {
  return rows.toSorted((left, right) => byCodeUnits(left.id, right.id)).map((row) => row.stored);
}

function unreadableSection(contents: CapturesFileContents): UnreadableSection | null {
  const named = new Set<unknown>([
    ...contents.captures.map((capture) => capture.bookId),
    ...contents.unreadableCaptures.map((capture) => capture.stored.bookId),
  ]);
  const shelved = new Set<BookId>([
    ...contents.books.map((book) => book.id),
    ...contents.unreadableBooks.map((book) => book.id),
  ]);
  const retired = contents.unreadableRemovedBooks.filter((book) => !shelved.has(book.id));
  const books = [...contents.unreadableBooks, ...retired].filter((book) => named.has(book.id));
  const section: UnreadableSection = {
    books: storedRows(books).map(jsonSafe),
    tags: storedRows(contents.unreadableTags).map(jsonSafe),
    captures: storedRows(contents.unreadableCaptures).map(jsonSafe),
  };
  const rows = section.books.length + section.tags.length + section.captures.length;
  return rows === 0 ? null : section;
}

function buildCapturesFile(contents: CapturesFileContents): BuiltCapturesFile {
  const known = identities(contents);
  const captures = contents.captures.toSorted(byCreationThenId);
  const held = new Set(captures.map((capture) => capture.bookId));
  const books = [...known.values()].filter((book) => held.has(book.id)).toSorted(byTitleThenId);
  const keys = new Map(books.map((book, index) => [book.id, keyAt(index)]));
  const entries = captures.flatMap((capture) => {
    const key = keys.get(capture.bookId);
    return key === undefined ? [] : [fileCapture(capture, key)];
  });
  const unreadable = unreadableSection(contents);
  const file: CapturesFile = {
    format: CAPTURES_FILE_FORMAT,
    version: CAPTURES_FILE_VERSION,
    exportedAt: contents.exportedAt,
    appVersion: contents.appVersion,
    books: books.map((book, index) => keyed(book, keyAt(index))),
    tags: contents.tags.toSorted(byCreationThenId),
    captures: entries,
    ...(unreadable === null ? {} : { unreadable }),
  };
  const bookless = captures.filter((capture) => !keys.has(capture.bookId));
  return { file, json: JSON.stringify(file), bookless: bookless.map((capture) => capture.id) };
}

export { buildCapturesFile };
export type { BuiltCapturesFile, CapturesFileContents };
