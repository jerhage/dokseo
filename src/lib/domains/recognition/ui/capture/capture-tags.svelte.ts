import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { tagId } from '$lib/shared/ids';
import type { CaptureId, TagId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import type { Result } from '$lib/shared/result';
import { tagCounts } from '../../domain/tag/capture-tags';
import type { Tag } from '../../domain/tag/tag';
import type { CreateTagError } from '../../use-cases/tag/create-tag';
import type { CaptureList } from './capture-list.svelte';
import { NOT_STORED, refuse, thrownFailure } from './storage-failure';
import type { StorageFailure } from './storage-failure';

type TagOutcome =
  | { readonly kind: 'created'; readonly tag: Tag }
  | { readonly kind: 'existing'; readonly tag: Tag }
  | { readonly kind: 'failed'; readonly failure: StorageFailure };

function tagOutcome(created: Result<Tag, CreateTagError | StorageFailure>): TagOutcome {
  if (created.ok) return { kind: 'created', tag: created.value };

  return match(created.error)
    .with({ kind: 'name-taken' }, (taken) => ({ kind: 'existing', tag: taken.tag }) as const)
    .with(
      { kind: 'storage-unavailable' },
      { kind: 'storage-failed' },
      { kind: 'not-stored' },
      (failure) => ({ kind: 'failed', failure }) as const,
    )
    .exhaustive();
}

function withTag(tags: readonly Tag[], tag: Tag): readonly Tag[] {
  return tags.some((held) => held.id === tag.id) ? tags : [...tags, tag];
}

function countsAfter(
  counts: ReadonlyMap<TagId, number>,
  before: readonly TagId[],
  after: readonly TagId[],
): ReadonlyMap<TagId, number> {
  const moved = new Map(counts);

  for (const tag of before) {
    if (!after.includes(tag)) moved.set(tag, Math.max((moved.get(tag) ?? 0) - 1, 0));
  }
  for (const tag of after) {
    if (!before.includes(tag)) moved.set(tag, (moved.get(tag) ?? 0) + 1);
  }

  return moved;
}

class CaptureTags {
  #container: Container;
  #notify: Notify;
  #list: CaptureList;
  #tags = $state.raw<readonly Tag[]>([]);
  #libraryCounts = $state.raw<ReadonlyMap<TagId, number>>(new Map());

  constructor(container: Container, notify: Notify, list: CaptureList) {
    this.#container = container;
    this.#notify = notify;
    this.#list = list;
  }

  get tags(): readonly Tag[] {
    return this.#tags;
  }

  get libraryCounts(): ReadonlyMap<TagId, number> {
    return this.#libraryCounts;
  }

  get bookCounts(): ReadonlyMap<TagId, number> {
    return tagCounts(this.#list.captures);
  }

  adopt(tags: readonly Tag[]): void {
    this.#tags = tags;
  }

  async loadTags(): Promise<void> {
    const generation = this.#list.generation;
    const named = await this.#container.recognition.listTags().catch(() => null);

    if (generation !== this.#list.generation || named === null || !named.ok) return;

    this.#tags = named.value;
  }

  async loadTagCounts(): Promise<void> {
    const generation = this.#list.generation;
    const everywhere = await this.#container.recognition.listEveryCapture().catch(() => null);

    if (generation !== this.#list.generation || everywhere === null || !everywhere.ok) return;

    this.#libraryCounts = tagCounts(everywhere.value);
  }

  async addTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.#list.stored(id);
    if (stored === undefined) {
      refuse(this.#notify, 'The tag could not be added', NOT_STORED);
      return;
    }

    const generation = this.#list.generation;
    const written = await this.#container.recognition
      .addTagToCapture(stored, tag)
      .catch(thrownFailure);

    if (generation !== this.#list.generation) return;
    if (!written.ok) {
      refuse(this.#notify, 'The tag could not be added', written.error);
      return;
    }

    this.#list.keep(written.value);
    this.#retag(id, stored.tagIds, written.value.tagIds);
  }

  async removeTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.#list.stored(id);
    if (stored === undefined) {
      refuse(this.#notify, 'The tag could not be removed', NOT_STORED);
      return;
    }

    const generation = this.#list.generation;
    const written = await this.#container.recognition
      .removeTagFromCapture(stored, tag)
      .catch(thrownFailure);

    if (generation !== this.#list.generation) return;
    if (!written.ok) {
      refuse(this.#notify, 'The tag could not be removed', written.error);
      return;
    }

    this.#list.keep(written.value);
    this.#retag(id, stored.tagIds, written.value.tagIds);
  }

  async createTag(id: CaptureId, name: string): Promise<void> {
    if (this.#list.stored(id) === undefined) {
      refuse(this.#notify, 'The tag could not be added', NOT_STORED);
      return;
    }

    const generation = this.#list.generation;
    const created = await this.#container.recognition
      .createTag(tagId(crypto.randomUUID()), name)
      .catch(thrownFailure);

    if (generation !== this.#list.generation) return;

    const outcome = tagOutcome(created);
    if (outcome.kind === 'failed') {
      refuse(this.#notify, 'The tag could not be created', outcome.failure);
      return;
    }

    const minted = outcome.tag;

    this.#tags = withTag(this.#tags, minted);
    await this.addTag(id, minted.id);
  }

  #retag(id: CaptureId, before: readonly TagId[], after: readonly TagId[]): void {
    this.#libraryCounts = countsAfter(this.#libraryCounts, before, after);
    this.#list.change(id, (capture) => ({ ...capture, tagIds: after }));
  }
}

export { CaptureTags };
