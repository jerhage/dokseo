import { isText } from '$lib/shared/corrupt-row';
import { parsedBookId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { isLanguage } from '$lib/shared/language';
import type { Language } from '$lib/shared/language';
import { effectiveDirection, isLayoutKind, isReadingDirection } from '$lib/shared/layout-kind';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import { FALLBACK_DIRECTION, FALLBACK_LANGUAGE } from './stored-book';

type RemovedBook = {
  readonly id: BookId;
  readonly title: string;
  readonly alias: string | null;
  readonly contentHash: string;
  readonly fileName: string;
  readonly language: Language;
  readonly direction: ReadingDirection;
};

type RemovedShelf =
  | { readonly kind: 'success'; readonly books: readonly RemovedBook[] }
  | StorageUnavailable;

type CapturesDeletion = { readonly kind: 'success' } | StorageUnavailable;

type RetiredRow = {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly alias?: unknown;
  readonly contentHash?: unknown;
  readonly fileName?: unknown;
  readonly language?: unknown;
  readonly direction?: unknown;
  readonly layoutKind?: unknown;
};

const UNTITLED_BOOK = 'Untitled book';

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

function directionOf(row: RetiredRow): ReadingDirection {
  const direction = isReadingDirection(row.direction) ? row.direction : FALLBACK_DIRECTION;
  return isLayoutKind(row.layoutKind) ? effectiveDirection(direction, row.layoutKind) : direction;
}

function removedBookFrom(row: RetiredRow): RemovedBook | null {
  const id = isText(row.id) ? parsedBookId(row.id) : null;
  if (id === null) return null;
  return {
    id,
    title: titleOf(row.title),
    alias: aliasOf(row.alias),
    contentHash: textOf(row.contentHash),
    fileName: textOf(row.fileName),
    language: isLanguage(row.language) ? row.language : FALLBACK_LANGUAGE,
    direction: directionOf(row),
  };
}

function removedBooksFrom(rows: readonly RetiredRow[]): readonly RemovedBook[] {
  return rows.flatMap((row) => {
    const removed = removedBookFrom(row);
    return removed === null ? [] : [removed];
  });
}

export { UNTITLED_BOOK, removedBookFrom, removedBooksFrom };
export type { CapturesDeletion, RemovedBook, RemovedShelf, RetiredRow };
