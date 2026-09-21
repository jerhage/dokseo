import type { TagId } from '$lib/shared/ids';
import { matchesQuery } from '$lib/shared/text-search';
import { inBooks } from '../capture/capture-results';
import type { BookMatches, SearchedBook, Tagged, Written } from '../capture/capture-results';
import type { Tag } from './tag';

type PaletteFilter = 'everything' | 'tags';

function namedTags(tags: readonly Tag[], query: string): ReadonlySet<TagId> {
  return new Set<TagId>(tags.filter((tag) => matchesQuery(tag.name, query)).map((tag) => tag.id));
}

function matchedTagIds(capture: Tagged, tags: readonly Tag[], query: string): readonly TagId[] {
  if (query.trim().length === 0) return [];

  const named = namedTags(tags, query);
  return capture.tagIds.filter((id) => named.has(id));
}

function paletteFinds<T extends Written & Tagged>(
  captures: readonly T[],
  books: readonly SearchedBook[],
  tags: readonly Tag[],
  query: string,
  filter: PaletteFilter,
): readonly BookMatches<T>[] {
  if (query.trim().length === 0) return [];

  const named = namedTags(tags, query);
  const found = captures.filter(
    (capture) =>
      capture.tagIds.some((id) => named.has(id)) ||
      (filter === 'everything' && matchesQuery(capture.text, query)),
  );

  return inBooks(found, books);
}

export { paletteFinds, matchedTagIds };
export type { PaletteFilter };
