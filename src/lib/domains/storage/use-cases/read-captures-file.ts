import { match, P } from 'ts-pattern';
import { isSourceKind } from '$lib/domains/library/domain/book/book';
import type { SourceKind } from '$lib/domains/library/domain/book/book';
import { captureFromStored } from '$lib/domains/recognition/domain/capture/capture';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import { tagFromStored } from '$lib/domains/recognition/domain/tag/tag';
import type { Tag } from '$lib/domains/recognition/domain/tag/tag';
import { isTagColour } from '$lib/domains/recognition/domain/tag/tag-colour';
import { isCaptureOrigin } from '$lib/shared/capture-origin';
import {
  CorruptRow,
  isFiniteNumberOrNull,
  isNumber,
  isNumberOrNull,
  isStoredFields,
  isStoredList,
  isText,
  isTextOrNull,
  knownStoredValue,
} from '$lib/shared/corrupt-row';
import type { StoredFields } from '$lib/shared/corrupt-row';
import { seriesId } from '$lib/shared/ids';
import type { CaptureId, SeriesId, TagId } from '$lib/shared/ids';
import { isLanguage } from '$lib/shared/language';
import { isLayoutKind, isReadingDirection } from '$lib/shared/layout-kind';
import type { LayoutKind } from '$lib/shared/layout-kind';
import { CAPTURES_FILE_FORMAT, CAPTURES_FILE_VERSION } from './captures-file';
import type { BooklessCapture, FileBook } from './captures-file';

type FileSection = 'books' | 'tags' | 'captures';

type UnreadableReason =
  | { readonly kind: 'invalid'; readonly detail: string }
  | { readonly kind: 'repeated'; readonly id: string }
  | { readonly kind: 'unknown-book'; readonly bookKey: string };

type UnreadableEntry = {
  readonly section: FileSection;
  readonly index: number;
  readonly reason: UnreadableReason;
};

type DroppedTag = { readonly captureId: CaptureId; readonly tagId: TagId };

type ReadCapture = { readonly book: FileBook; readonly capture: BooklessCapture };

type ReadCapturesFileResult =
  | {
      readonly kind: 'read';
      readonly exportedAt: number;
      readonly appVersion: string;
      readonly books: readonly FileBook[];
      readonly tags: readonly Tag[];
      readonly captures: readonly ReadCapture[];
      readonly unreadable: readonly UnreadableEntry[];
      readonly droppedTags: readonly DroppedTag[];
    }
  | { readonly kind: 'not-an-export' }
  | { readonly kind: 'newer-version'; readonly version: number };

type Sections = {
  readonly exportedAt: number;
  readonly appVersion: string;
  readonly books: readonly unknown[];
  readonly tags: readonly unknown[];
  readonly captures: readonly unknown[];
};

type Entry<T> =
  | { readonly kind: 'readable'; readonly value: T }
  | { readonly kind: 'unreadable'; readonly reason: UnreadableReason };

const NOT_AN_EXPORT: ReadCapturesFileResult = { kind: 'not-an-export' };

function parsed(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

function field<T>(row: string, name: string, value: unknown, known: (v: unknown) => v is T): T {
  return knownStoredValue(row, name, value, known);
}

function fields(row: string, value: unknown): StoredFields {
  return field(row, 'entry', value, isStoredFields);
}

function isLayoutKindOrNull(value: unknown): value is LayoutKind | null {
  return value === null || isLayoutKind(value);
}

function isSourceKindOrNull(value: unknown): value is SourceKind | null {
  return value === null || isSourceKind(value);
}

function isKey(value: unknown): value is string {
  return isText(value) && value.length > 0;
}

function fileSeriesId(value: unknown): SeriesId | null {
  if (value === undefined) return null;
  const read = field('book', 'series id', value, isTextOrNull);
  return read === null ? null : seriesId(read);
}

function fileVolume(value: unknown): number | null {
  return value === undefined ? null : field('book', 'volume', value, isFiniteNumberOrNull);
}

function fileBook(entry: unknown): FileBook {
  const book = fields('book', entry);
  return {
    key: field('book', 'key', book.key, isKey),
    contentHash: field('book', 'content hash', book.contentHash, isText),
    fileName: field('book', 'file name', book.fileName, isText),
    title: field('book', 'title', book.title, isText),
    alias: field('book', 'alias', book.alias, isTextOrNull),
    seriesId: fileSeriesId(book.seriesId),
    volume: fileVolume(book.volume),
    language: field('book', 'language', book.language, isLanguage),
    direction: field('book', 'direction', book.direction, isReadingDirection),
    layoutKind: field('book', 'layout kind', book.layoutKind, isLayoutKindOrNull),
    sourceKind: field('book', 'source kind', book.sourceKind, isSourceKindOrNull),
    imageCount: field('book', 'image count', book.imageCount, isNumberOrNull),
  };
}

function fileTag(entry: unknown): Tag {
  const tag = fields('tag', entry);
  field('tag', 'colour', tag.colour, isTagColour);
  return tagFromStored(tag);
}

function strippedOfBook(capture: Capture): BooklessCapture {
  const { bookId: _bookKey, ...bookless } = capture;
  return bookless;
}

function fileCapture(entry: unknown): { readonly bookKey: string; readonly capture: Capture } {
  const capture = fields('capture', entry);
  field('capture', 'origin', capture.origin, isCaptureOrigin);
  const bookKey = field('capture', 'book key', capture.bookKey, isKey);
  return { bookKey, capture: captureFromStored({ ...capture, bookId: bookKey }) };
}

function entryOf<T>(read: () => T): Entry<T> {
  try {
    return { kind: 'readable', value: read() };
  } catch (error) {
    if (!(error instanceof CorruptRow)) throw error;
    return { kind: 'unreadable', reason: { kind: 'invalid', detail: error.message } };
  }
}

function sectionsOf(file: StoredFields): Sections | null {
  const { exportedAt, appVersion, books, tags, captures } = file;
  if (!isNumber(exportedAt) || !isText(appVersion)) return null;
  if (!isStoredList(books) || !isStoredList(tags) || !isStoredList(captures)) return null;
  return { exportedAt, appVersion, books, tags, captures };
}

function readSections(sections: Sections): ReadCapturesFileResult {
  const unreadable: UnreadableEntry[] = [];
  const droppedTags: DroppedTag[] = [];
  const skip = (section: FileSection, index: number, reason: UnreadableReason) => {
    unreadable.push({ section, index, reason });
  };

  const books = new Map<string, FileBook>();
  sections.books.forEach((entry, index) => {
    const read = entryOf(() => fileBook(entry));
    if (read.kind === 'unreadable') return skip('books', index, read.reason);
    const { key } = read.value;
    if (books.has(key)) return skip('books', index, { kind: 'repeated', id: key });
    books.set(key, read.value);
  });

  const tags = new Map<TagId, Tag>();
  sections.tags.forEach((entry, index) => {
    const read = entryOf(() => fileTag(entry));
    if (read.kind === 'unreadable') return skip('tags', index, read.reason);
    const { id } = read.value;
    if (tags.has(id)) return skip('tags', index, { kind: 'repeated', id });
    tags.set(id, read.value);
  });

  const captures = new Map<CaptureId, ReadCapture>();
  sections.captures.forEach((entry, index) => {
    const read = entryOf(() => fileCapture(entry));
    if (read.kind === 'unreadable') return skip('captures', index, read.reason);
    const { bookKey, capture } = read.value;
    const book = books.get(bookKey);
    if (book === undefined) return skip('captures', index, { kind: 'unknown-book', bookKey });
    if (captures.has(capture.id)) {
      return skip('captures', index, { kind: 'repeated', id: capture.id });
    }
    const missing = capture.tagIds.filter((id) => !tags.has(id));
    for (const tagId of missing) droppedTags.push({ captureId: capture.id, tagId });
    const tagIds = capture.tagIds.filter((id) => tags.has(id));
    captures.set(capture.id, { book, capture: strippedOfBook({ ...capture, tagIds }) });
  });

  return {
    kind: 'read',
    exportedAt: sections.exportedAt,
    appVersion: sections.appVersion,
    books: [...books.values()],
    tags: [...tags.values()],
    captures: [...captures.values()],
    unreadable,
    droppedTags,
  };
}

function readCapturesFile(text: string): ReadCapturesFileResult {
  const file = parsed(text);
  if (!isStoredFields(file) || file.format !== CAPTURES_FILE_FORMAT) return NOT_AN_EXPORT;

  return match(file.version)
    .with(CAPTURES_FILE_VERSION, () => {
      const sections = sectionsOf(file);
      return sections === null ? NOT_AN_EXPORT : readSections(sections);
    })
    .with(P.number.int().gt(CAPTURES_FILE_VERSION), (version): ReadCapturesFileResult => ({
      kind: 'newer-version',
      version,
    }))
    .otherwise(() => NOT_AN_EXPORT);
}

export { readCapturesFile };
export type {
  DroppedTag,
  FileSection,
  ReadCapture,
  ReadCapturesFileResult,
  UnreadableEntry,
  UnreadableReason,
};
