import type { TagId } from '$lib/shared/ids';
import { matchesQuery } from '$lib/shared/text-search';
import { matchesByBook, matchTally } from '../capture/capture-results';
import type { BookMatches, SearchedBook } from '../capture/capture-results';
import { tagCounts } from './capture-tags';
import type { Tag } from './tag';
import { tagSummary } from './tag-summary';
import type { TagMember } from './tag-summary';

type PaletteFilter = 'everything' | 'tags';

type PaletteTag =
  | {
      readonly kind: 'named';
      readonly tag: Tag;
      readonly captures: number;
      readonly documents: number;
    }
  | { readonly kind: 'carried'; readonly tag: Tag; readonly here: number; readonly total: number };

type PaletteFinds<T> = {
  readonly tags: readonly PaletteTag[];
  readonly captures: readonly BookMatches<T>[];
};

type PaletteTally = { readonly tags: number; readonly captures: number };

function paletteCount(row: PaletteTag): number {
  return row.kind === 'named' ? row.captures : row.here;
}

function inFindOrder(rows: readonly PaletteTag[]): readonly PaletteTag[] {
  return rows.toSorted((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'named' ? -1 : 1;

    const leftCount = paletteCount(left);
    const rightCount = paletteCount(right);
    if (leftCount !== rightCount) return rightCount - leftCount;

    return left.tag.name.localeCompare(right.tag.name);
  });
}

function namedRows(
  captures: readonly TagMember[],
  tags: readonly Tag[],
  query: string,
): readonly PaletteTag[] {
  return tags
    .filter((tag) => matchesQuery(tag.name, query))
    .map((tag) => {
      const summary = tagSummary(captures, tag.id);

      return {
        kind: 'named',
        tag,
        captures: summary.captures,
        documents: summary.documents,
      } as const;
    });
}

function carriedRows(
  captures: readonly TagMember[],
  tags: readonly Tag[],
  named: ReadonlySet<TagId>,
  matched: readonly BookMatches<TagMember>[],
): readonly PaletteTag[] {
  const here = tagCounts(matched.flatMap((book) => book.captures));

  return tags
    .filter((tag) => !named.has(tag.id))
    .map((tag) => ({ tag, here: here.get(tag.id) ?? 0 }))
    .filter((row) => row.here > 0)
    .map(
      (row) =>
        ({
          kind: 'carried',
          tag: row.tag,
          here: row.here,
          total: tagSummary(captures, row.tag.id).captures,
        }) as const,
    );
}

function paletteFinds<T extends TagMember>(
  captures: readonly T[],
  books: readonly SearchedBook[],
  tags: readonly Tag[],
  query: string,
  filter: PaletteFilter,
): PaletteFinds<T> {
  if (query.trim().length === 0) return { tags: [], captures: [] };

  const found = namedRows(captures, tags, query);
  if (filter === 'tags') return { tags: inFindOrder(found), captures: [] };

  const matched = matchesByBook(captures, books, query);
  const named = new Set<TagId>(found.map((row) => row.tag.id));
  const carried = carriedRows(captures, tags, named, matched);

  return { tags: inFindOrder([...found, ...carried]), captures: matched };
}

function paletteTally<T>(finds: PaletteFinds<T>): PaletteTally {
  return { tags: finds.tags.length, captures: matchTally(finds.captures) };
}

export { paletteFinds, paletteTally };
export type { PaletteFilter, PaletteTag, PaletteFinds, PaletteTally };
