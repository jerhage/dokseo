import { match } from 'ts-pattern';
import type { Anchor } from '$lib/shared/anchor';
import type { BookId, TagId } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { matchesQuery } from '$lib/shared/text-search';
import { inBookOrder } from './capture-order';

type SearchedBook = {
  readonly id: BookId;
  readonly title: string;
  readonly language: Language;
  readonly direction: ReadingDirection;
};

type SearchedCapture =
  | { readonly origin: 'recognized'; readonly text: string; readonly note: string | null }
  | { readonly origin: 'lifted'; readonly text: string; readonly note: string | null }
  | { readonly origin: 'written'; readonly text: string };

type Written = SearchedCapture & {
  readonly bookId: BookId;
  readonly anchor: Anchor;
};

type Tagged = {
  readonly tagIds: readonly TagId[];
};

type BookMatches<T> = {
  readonly book: SearchedBook;
  readonly captures: readonly T[];
};

function noteOn(capture: SearchedCapture): string | null {
  return match(capture)
    .with({ origin: 'written' }, () => null)
    .with({ origin: 'recognized' }, (read) => read.note)
    .with({ origin: 'lifted' }, (lifted) => lifted.note)
    .exhaustive();
}

function captureHolds(capture: SearchedCapture, query: string): boolean {
  if (matchesQuery(capture.text, query)) return true;

  const note = noteOn(capture);
  if (note === null) return false;

  return matchesQuery(note, query);
}

function heldByBook<T extends Written>(captures: readonly T[]): ReadonlyMap<BookId, T[]> {
  const grouped = new Map<BookId, T[]>();

  for (const capture of captures) {
    const held = grouped.get(capture.bookId);
    if (held === undefined) grouped.set(capture.bookId, [capture]);
    else held.push(capture);
  }

  return grouped;
}

function inBooks<T extends Written>(
  found: readonly T[],
  books: readonly SearchedBook[],
): readonly BookMatches<T>[] {
  if (found.length === 0) return [];

  const grouped = heldByBook(found);
  return books
    .map((book) => ({ book, captures: inBookOrder(grouped.get(book.id) ?? [], book.direction) }))
    .filter((matched) => matched.captures.length > 0);
}

function matchesByBook<T extends Written>(
  captures: readonly T[],
  books: readonly SearchedBook[],
  query: string,
): readonly BookMatches<T>[] {
  return inBooks(
    captures.filter((capture) => captureHolds(capture, query)),
    books,
  );
}

function taggedByBook<T extends Written & Tagged>(
  captures: readonly T[],
  books: readonly SearchedBook[],
  tag: TagId,
): readonly BookMatches<T>[] {
  return inBooks(
    captures.filter((capture) => capture.tagIds.includes(tag)),
    books,
  );
}

function matchTally<T>(matched: readonly BookMatches<T>[]): number {
  return matched.reduce((total, book) => total + book.captures.length, 0);
}

export { captureHolds, inBooks, matchesByBook, noteOn, taggedByBook, matchTally };
export type { SearchedBook, SearchedCapture, Written, Tagged, BookMatches };
