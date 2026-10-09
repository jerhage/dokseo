import { match } from 'ts-pattern';
import type { TagId } from '$lib/shared/ids';
import type { ReadState } from '$lib/shared/read-state';
import { matchesQuery } from '$lib/shared/text-search';
import type { Capture } from '../../domain/capture/capture';
import type { PassageOrder } from '../../domain/capture/capture-order';
import { taggedByBook } from '../../domain/capture/capture-results';
import type { BookMatches, SearchedBook } from '../../domain/capture/capture-results';
import { tagCounts } from '../../domain/tag/capture-tags';
import { sameTagName } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { tagOptions } from '../../domain/tag/tag-match';
import type { TagOption } from '../../domain/tag/tag-match';
import { alsoTagged, tagSummary } from '../../domain/tag/tag-summary';
import type { AlsoTagged, TagSummary } from '../../domain/tag/tag-summary';

type TagViewStatus = 'idle' | 'loading' | 'ready' | 'failed';

type TaggedCaptures = {
  readonly tags: readonly Tag[];
  readonly captures: readonly Capture[];
};

type TagSource = {
  readonly books: readonly SearchedBook[];
  readonly wanted: string | null;
  readonly tagged: ReadState<TaggedCaptures> | null;
};

type TagViewRead = {
  readonly tags: readonly Tag[];
  readonly captures: readonly Capture[];
  readonly status: TagViewStatus;
  readonly chosen: TagId | null;
  readonly known: readonly Capture[];
  readonly counts: ReadonlyMap<TagId, number>;
  readonly column: readonly TagOption[];
  readonly tagsById: ReadonlyMap<TagId, Tag>;
  readonly summary: TagSummary | null;
  readonly also: readonly AlsoTagged[];
};

const NOTHING_TAGGED: TaggedCaptures = { tags: [], captures: [] };

function taggedCapturesOf(tags: readonly Tag[], captures: readonly Capture[]): TaggedCaptures {
  return { tags, captures };
}

function heldTagged(tagged: ReadState<TaggedCaptures> | null): TaggedCaptures {
  return tagged?.kind === 'ready' ? tagged.value : NOTHING_TAGGED;
}

function tagViewStatus(tagged: ReadState<TaggedCaptures> | null): TagViewStatus {
  if (tagged === null) return 'idle';

  return match(tagged)
    .with({ kind: 'loading' }, (): TagViewStatus => 'loading')
    .with({ kind: 'failed' }, (): TagViewStatus => 'failed')
    .with({ kind: 'ready' }, (): TagViewStatus => 'ready')
    .exhaustive();
}

function chosenTag(tags: readonly Tag[], wanted: string | null): TagId | null {
  if (wanted === null) return null;

  return tags.find((tag) => sameTagName(tag.name, wanted))?.id ?? null;
}

function tagViewOf(source: TagSource, filter: string): TagViewRead {
  const { tags, captures } = heldTagged(source.tagged);
  const chosen = chosenTag(tags, source.wanted);
  const shelved = new Set(source.books.map((book) => book.id));
  const known = captures.filter((capture) => shelved.has(capture.bookId));
  const counts = tagCounts(known);
  const wanted = filter.trim();
  const named = wanted.length === 0 ? tags : tags.filter((tag) => matchesQuery(tag.name, wanted));

  return {
    tags,
    captures,
    status: tagViewStatus(source.tagged),
    chosen,
    known,
    counts,
    column: tagOptions(named, counts),
    tagsById: new Map(tags.map((tag) => [tag.id, tag])),
    summary: chosen === null ? null : tagSummary(known, chosen),
    also: chosen === null ? [] : alsoTagged(known, chosen),
  };
}

function taggedGroupsOf(
  read: TagViewRead,
  books: readonly SearchedBook[],
  passages: PassageOrder,
): readonly BookMatches<Capture>[] {
  if (read.chosen === null) return [];

  return taggedByBook(read.known, books, read.chosen, passages);
}

export { heldTagged, tagViewOf, tagViewStatus, taggedCapturesOf, taggedGroupsOf };
export type { TagSource, TagViewRead, TagViewStatus, TaggedCaptures };
