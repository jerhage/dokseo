import { useQueryClient } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { tagId } from '$lib/shared/ids';
import type { CaptureId, TagId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import type { Result } from '$lib/shared/result';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError } from '../../domain/capture/capture-repository';
import { tagCounts } from '../../domain/tag/capture-tags';
import type { Tag } from '../../domain/tag/tag';
import { recognitionKeys } from '../../queries/recognition-keys';
import { addTagMutation, createTagMutation, removeTagMutation } from '../../queries/tag-queries';
import type { CaptureTagging, NewTag } from '../../queries/tag-queries';
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

class CaptureTags {
  #notify: Notify;
  #list: CaptureList;
  #tags = $state.raw<readonly Tag[]>([]);
  #adding: WriteQuery<Result<Capture, CaptureError>, CaptureTagging>;
  #removing: WriteQuery<Result<Capture, CaptureError>, CaptureTagging>;
  #creating: WriteQuery<Result<Tag, CreateTagError>, NewTag>;

  constructor(container: Container, notify: Notify, list: CaptureList) {
    const client = useQueryClient();
    const recognition = container.recognition;
    const refresh = (queryKey: readonly unknown[]) => {
      void client.invalidateQueries({ queryKey });
    };
    this.#notify = notify;
    this.#list = list;
    this.#adding = writeQuery(() => ({
      ...addTagMutation(recognition),
      onSuccess: (written) => {
        if (written.ok) refresh(recognitionKeys.everyCapture());
      },
    }));
    this.#removing = writeQuery(() => ({
      ...removeTagMutation(recognition),
      onSuccess: (written) => {
        if (written.ok) refresh(recognitionKeys.everyCapture());
      },
    }));
    this.#creating = writeQuery(() => ({
      ...createTagMutation(recognition),
      onSuccess: (created) => {
        if (created.ok) refresh(recognitionKeys.tags());
      },
    }));
  }

  get tags(): readonly Tag[] {
    return this.#tags;
  }

  get bookCounts(): ReadonlyMap<TagId, number> {
    return tagCounts(this.#list.captures);
  }

  adopt(tags: readonly Tag[]): void {
    this.#tags = tags;
  }

  async addTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.#list.stored(id);
    if (stored === undefined) {
      refuse(this.#notify, 'The tag could not be added', NOT_STORED);
      return;
    }

    const generation = this.#list.generation;
    const written = await this.#adding.run({ capture: stored, tag }).catch(thrownFailure);

    if (generation !== this.#list.generation) return;
    if (!written.ok) {
      refuse(this.#notify, 'The tag could not be added', written.error);
      return;
    }

    this.#list.keep(written.value);
    this.#retag(id, written.value.tagIds);
  }

  async removeTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.#list.stored(id);
    if (stored === undefined) {
      refuse(this.#notify, 'The tag could not be removed', NOT_STORED);
      return;
    }

    const generation = this.#list.generation;
    const written = await this.#removing.run({ capture: stored, tag }).catch(thrownFailure);

    if (generation !== this.#list.generation) return;
    if (!written.ok) {
      refuse(this.#notify, 'The tag could not be removed', written.error);
      return;
    }

    this.#list.keep(written.value);
    this.#retag(id, written.value.tagIds);
  }

  async createTag(id: CaptureId, name: string): Promise<void> {
    if (this.#list.stored(id) === undefined) {
      refuse(this.#notify, 'The tag could not be added', NOT_STORED);
      return;
    }

    const generation = this.#list.generation;
    const created = await this.#creating
      .run({ id: tagId(crypto.randomUUID()), name })
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

  #retag(id: CaptureId, after: readonly TagId[]): void {
    this.#list.change(id, (capture) => ({ ...capture, tagIds: after }));
  }
}

export { CaptureTags, tagOutcome, withTag };
export type { TagOutcome };
