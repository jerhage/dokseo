import type { BookId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
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

type Written = {
  readonly bookId: BookId;
  readonly regions: readonly ImageRegion[];
  readonly text: string;
};

type Tagged = {
  readonly tagIds: readonly TagId[];
};

type BookMatches<T> = {
  readonly book: SearchedBook;
  readonly captures: readonly T[];
};

function heldByBook<T extends Written>(captures: readonly T[]): ReadonlyMap<BookId, T[]> {
  const grouped = new Map<BookId, T[]>();

  for (const capture of captures) {
    const held = grouped.get(capture.bookId);
    if (held === undefined) grouped.set(capture.bookId, [capture]);
    else held.push(capture);
  }

  return grouped;
}

function matchesByBook<T extends Written>(
  captures: readonly T[],
  books: readonly SearchedBook[],
  query: string,
): readonly BookMatches<T>[] {
  const found = captures.filter((capture) => matchesQuery(capture.text, query));
  if (found.length === 0) return [];

  const grouped = heldByBook(found);
  return books
    .map((book) => ({ book, captures: inBookOrder(grouped.get(book.id) ?? [], book.direction) }))
    .filter((matched) => matched.captures.length > 0);
}

function taggedByBook<T extends Written & Tagged>(
  captures: readonly T[],
  books: readonly SearchedBook[],
  tag: TagId,
): readonly BookMatches<T>[] {
  const held = captures.filter((capture) => capture.tagIds.includes(tag));
  if (held.length === 0) return [];

  const grouped = heldByBook(held);
  return books
    .map((book) => ({ book, captures: inBookOrder(grouped.get(book.id) ?? [], book.direction) }))
    .filter((tagged) => tagged.captures.length > 0);
}

function matchTally<T>(matched: readonly BookMatches<T>[]): number {
  return matched.reduce((total, book) => total + book.captures.length, 0);
}

export { matchesByBook, taggedByBook, matchTally };
export type { SearchedBook, Written, Tagged, BookMatches };
