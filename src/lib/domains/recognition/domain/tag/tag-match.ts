import { matchesQuery } from '$lib/shared/text-search';
import type { TagId } from '$lib/shared/ids';
import { sameTagName } from './tag';
import type { Tag } from './tag';

type TagOption = { readonly tag: Tag; readonly count: number };

type TagMatches =
  | { readonly kind: 'every'; readonly options: readonly TagOption[] }
  | { readonly kind: 'matched'; readonly options: readonly TagOption[]; readonly create: string }
  | { readonly kind: 'matched-only'; readonly options: readonly TagOption[] }
  | { readonly kind: 'create-only'; readonly create: string }
  | { readonly kind: 'taken' };

function tagOptions(
  tags: readonly Tag[],
  counts: ReadonlyMap<TagId, number>,
): readonly TagOption[] {
  return tags
    .map((tag) => ({ tag, count: counts.get(tag.id) ?? 0 }))
    .toSorted((left, right) => {
      if (left.count !== right.count) return right.count - left.count;

      return left.tag.name.localeCompare(right.tag.name);
    });
}

function tagMatches(
  tags: readonly Tag[],
  counts: ReadonlyMap<TagId, number>,
  carried: readonly TagId[],
  query: string,
): TagMatches {
  const offerable = tags.filter((tag) => !carried.includes(tag.id));
  const create = query.trim();
  if (create.length === 0) return { kind: 'every', options: tagOptions(offerable, counts) };

  const options = tagOptions(
    offerable.filter((tag) => matchesQuery(tag.name, create)),
    counts,
  );
  const free = !tags.some((tag) => sameTagName(tag.name, create));

  if (options.length > 0) {
    return free ? { kind: 'matched', options, create } : { kind: 'matched-only', options };
  }

  return free ? { kind: 'create-only', create } : { kind: 'taken' };
}

export { tagOptions, tagMatches };
export type { TagOption, TagMatches };
