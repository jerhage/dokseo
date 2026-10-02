import type { TagId } from '$lib/shared/ids';
import { matchesQuery } from '$lib/shared/text-search';
import { captureHolds, inBooks } from './capture-results';
import type { BookMatches, SearchedBook, Tagged, Written } from './capture-results';
import type { PassageOrder } from './capture-order';
import type { Tag } from '../tag/tag';

type SearchFilter = 'everything' | 'tags';

type QuickFinds<T> = {
  readonly books: readonly SearchedBook[];
  readonly captures: readonly BookMatches<T>[];
};

function namedTags(tags: readonly Tag[], query: string): ReadonlySet<TagId> {
  return new Set<TagId>(tags.filter((tag) => matchesQuery(tag.name, query)).map((tag) => tag.id));
}

function matchedTagIds(capture: Tagged, tags: readonly Tag[], query: string): readonly TagId[] {
  if (query.trim().length === 0) return [];

  const named = namedTags(tags, query);
  return capture.tagIds.filter((id) => named.has(id));
}

function titledBooks(
  books: readonly SearchedBook[],
  query: string,
  filter: SearchFilter,
): readonly SearchedBook[] {
  if (filter === 'tags') return [];

  return books.filter((book) => !book.removed && matchesQuery(book.title, query));
}

function quickFinds<T extends Written & Tagged>(
  captures: readonly T[],
  books: readonly SearchedBook[],
  tags: readonly Tag[],
  query: string,
  filter: SearchFilter,
  passages: PassageOrder,
): QuickFinds<T> {
  if (query.trim().length === 0) return { books: [], captures: [] };

  const named = namedTags(tags, query);
  const found = captures.filter(
    (capture) =>
      capture.tagIds.some((id) => named.has(id)) ||
      (filter === 'everything' && captureHolds(capture, query)),
  );

  return { books: titledBooks(books, query, filter), captures: inBooks(found, books, passages) };
}

export { quickFinds, matchedTagIds };
export type { SearchFilter, QuickFinds };
