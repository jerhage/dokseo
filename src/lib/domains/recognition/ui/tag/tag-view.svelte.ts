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

class TagView {
  filter = $state('');

  #source: () => TagSource;
  #passages: PassageOrder;

  constructor(source: () => TagSource, passages: PassageOrder) {
    this.#source = source;
    this.#passages = passages;
  }

  get tags(): readonly Tag[] {
    return heldTagged(this.#source().tagged).tags;
  }

  get captures(): readonly Capture[] {
    return heldTagged(this.#source().tagged).captures;
  }

  get status(): TagViewStatus {
    return tagViewStatus(this.#source().tagged);
  }

  get books(): readonly SearchedBook[] {
    return this.#source().books;
  }

  get wanted(): string | null {
    return this.#source().wanted;
  }

  get chosen(): TagId | null {
    const wanted = this.wanted;
    if (wanted === null) return null;

    return this.tags.find((tag) => sameTagName(tag.name, wanted))?.id ?? null;
  }

  get known(): readonly Capture[] {
    const shelved = new Set(this.books.map((book) => book.id));

    return this.captures.filter((capture) => shelved.has(capture.bookId));
  }

  get counts(): ReadonlyMap<TagId, number> {
    return tagCounts(this.known);
  }

  get column(): readonly TagOption[] {
    const wanted = this.filter.trim();
    const named =
      wanted.length === 0 ? this.tags : this.tags.filter((tag) => matchesQuery(tag.name, wanted));

    return tagOptions(named, this.counts);
  }

  get tagsById(): ReadonlyMap<TagId, Tag> {
    return new Map(this.tags.map((tag) => [tag.id, tag]));
  }

  get summary(): TagSummary | null {
    const chosen = this.chosen;
    if (chosen === null) return null;

    return tagSummary(this.known, chosen);
  }

  get also(): readonly AlsoTagged[] {
    const chosen = this.chosen;
    if (chosen === null) return [];

    return alsoTagged(this.known, chosen);
  }

  get groups(): readonly BookMatches<Capture>[] {
    const chosen = this.chosen;
    if (chosen === null) return [];

    return taggedByBook(this.known, this.books, chosen, this.#passages);
  }
}

export { TagView, heldTagged, tagViewStatus, taggedCapturesOf };
export type { TagSource, TagViewStatus, TaggedCaptures };
