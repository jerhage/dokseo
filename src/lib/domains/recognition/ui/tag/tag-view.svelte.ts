import type { Container } from '$lib/container';
import type { TagId } from '$lib/shared/ids';
import { matchesQuery } from '$lib/shared/text-search';
import type { Capture } from '../../domain/capture/capture';
import { taggedByBook } from '../../domain/capture/capture-results';
import type { BookMatches, SearchedBook } from '../../domain/capture/capture-results';
import { tagCounts } from '../../domain/tag/capture-tags';
import type { Tag } from '../../domain/tag/tag';
import { tagOptions } from '../../domain/tag/tag-match';
import type { TagOption } from '../../domain/tag/tag-match';
import { alsoTagged, tagSummary } from '../../domain/tag/tag-summary';
import type { AlsoTagged, TagSummary } from '../../domain/tag/tag-summary';

type TagViewStatus = 'idle' | 'loading' | 'ready' | 'failed';

class TagView {
  tags = $state.raw<readonly Tag[]>([]);
  captures = $state.raw<readonly Capture[]>([]);
  chosen = $state.raw<TagId | null>(null);
  books = $state.raw<readonly SearchedBook[]>([]);
  filter = $state('');
  status = $state<TagViewStatus>('idle');

  #container: Container;
  #generation = 0;

  constructor(container: Container) {
    this.#container = container;
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

  choose(tag: TagId | null): void {
    this.chosen = tag;
  }

  get groups(): readonly BookMatches<Capture>[] {
    const chosen = this.chosen;
    if (chosen === null) return [];

    return taggedByBook(this.known, this.books, chosen);
  }

  async load(): Promise<void> {
    const generation = ++this.#generation;
    this.status = 'loading';

    const [named, listed] = await Promise.all([
      this.#container.recognition.listTags().catch(() => null),
      this.#container.recognition.listEveryCapture().catch(() => null),
    ]);

    if (generation !== this.#generation) return;

    if (named === null || !named.ok || listed === null || !listed.ok) {
      this.status = 'failed';
      return;
    }

    this.tags = named.value;
    this.captures = listed.value;
    this.status = 'ready';
  }
}

export { TagView };
export type { TagViewStatus };
