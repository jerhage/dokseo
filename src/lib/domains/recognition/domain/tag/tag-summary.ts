import type { BookId, TagId } from '$lib/shared/ids';
import type { Tagged, Written } from '../capture/capture-results';

type TagMember = Written & Tagged & { readonly createdAt: number };

type TagSummary = {
  readonly captures: number;
  readonly documents: number;
  readonly lastAdded: number | null;
};

type AlsoTagged = {
  readonly id: TagId;
  readonly count: number;
};

function carrying<T extends Tagged>(captures: readonly T[], tag: TagId): readonly T[] {
  return captures.filter((capture) => capture.tagIds.includes(tag));
}

function tagSummary(captures: readonly TagMember[], tag: TagId): TagSummary {
  const held = carrying(captures, tag);
  const documents = new Set<BookId>(held.map((capture) => capture.bookId));
  let lastAdded: number | null = null;

  for (const capture of held) {
    if (lastAdded === null || capture.createdAt > lastAdded) lastAdded = capture.createdAt;
  }

  return { captures: held.length, documents: documents.size, lastAdded };
}

function alsoTagged(captures: readonly Tagged[], tag: TagId): readonly AlsoTagged[] {
  const counts = new Map<TagId, number>();

  for (const capture of carrying(captures, tag)) {
    for (const other of capture.tagIds) {
      if (other !== tag) counts.set(other, (counts.get(other) ?? 0) + 1);
    }
  }

  return [...counts]
    .map(([id, count]) => ({ id, count }))
    .toSorted((left, right) => {
      if (left.count !== right.count) return right.count - left.count;

      return left.id.localeCompare(right.id);
    });
}

export { tagSummary, alsoTagged };
export type { TagMember, TagSummary, AlsoTagged };
