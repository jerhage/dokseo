import type { BookId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { matchesQuery } from '$lib/shared/text-search';
import { inBookOrder } from './capture-order';

export type SearchedBook = {
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

export type BookMatches<T> = {
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

export function matchesByBook<T extends Written>(
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

export function matchTally<T>(matched: readonly BookMatches<T>[]): number {
  return matched.reduce((total, book) => total + book.captures.length, 0);
}
