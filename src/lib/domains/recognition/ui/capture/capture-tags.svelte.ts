import { match } from 'ts-pattern';
import { tagId } from '$lib/shared/ids';
import type { CaptureId, TagId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import type { Result } from '$lib/shared/result';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureError } from '../../domain/capture/capture-repository';
import { tagCounts } from '../../domain/tag/capture-tags';
import type { Tag } from '../../domain/tag/tag';
import { addTagMutation, createTagMutation, removeTagMutation } from '../../queries/tag-queries';
import type { CaptureTagging, NewTag, TagWrites } from '../../queries/tag-queries';
import type { CreateTagError } from '../../use-cases/tag/create-tag';
import type { CaptureCache } from './capture-cache';
import type { CaptureList } from './capture-list.svelte';
import { NOT_STORED, refuse } from './storage-failure';
import type { StorageFailure } from './storage-failure';

const TAG_NOT_ADDED = 'The tag could not be added';

const TAG_NOT_REMOVED = 'The tag could not be removed';

const TAG_NOT_CREATED = 'The tag could not be created';

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

class CaptureTags {
  #notify: Notify;
  #list: CaptureList;
  #cache: CaptureCache;
  #adding: WriteQuery<Result<Capture, CaptureError>, CaptureTagging>;
  #removing: WriteQuery<Result<Capture, CaptureError>, CaptureTagging>;
  #creating: WriteQuery<Result<Tag, CreateTagError>, NewTag>;

  constructor(
    recognition: Pick<TagWrites, 'addTagToCapture' | 'removeTagFromCapture' | 'createTag'>,
    notify: Notify,
    list: CaptureList,
    cache: CaptureCache,
  ) {
    this.#notify = notify;
    this.#list = list;
    this.#cache = cache;
    this.#adding = writeQuery(() => ({
      ...addTagMutation(recognition),
      onSuccess: (written) => {
        if (written.ok) cache.put(written.value);
      },
      onError: (cause) => this.#fail(TAG_NOT_ADDED, cause),
      onSettled: (_written, _cause, { capture }) => cache.refresh(capture.bookId),
    }));
    this.#removing = writeQuery(() => ({
      ...removeTagMutation(recognition),
      onSuccess: (written) => {
        if (written.ok) cache.put(written.value);
      },
      onError: (cause) => this.#fail(TAG_NOT_REMOVED, cause),
      onSettled: (_written, _cause, { capture }) => cache.refresh(capture.bookId),
    }));
    this.#creating = writeQuery(() => ({
      ...createTagMutation(recognition),
      onSuccess: (created) => {
        if (created.ok) void cache.refreshTags();
      },
      onError: (cause) => this.#fail(TAG_NOT_CREATED, cause),
    }));
  }

  get tags(): readonly Tag[] {
    return this.#list.tags;
  }

  get bookCounts(): ReadonlyMap<TagId, number> {
    return tagCounts(this.#list.captures);
  }

  async addTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.#list.stored(id);
    if (stored === undefined) {
      refuse(this.#notify, TAG_NOT_ADDED, NOT_STORED);
      return;
    }

    const written = await this.#adding.run({ capture: stored, tag }).catch(() => null);
    if (written !== null && !written.ok) refuse(this.#notify, TAG_NOT_ADDED, written.error);
  }

  async removeTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.#list.stored(id);
    if (stored === undefined) {
      refuse(this.#notify, TAG_NOT_REMOVED, NOT_STORED);
      return;
    }

    const written = await this.#removing.run({ capture: stored, tag }).catch(() => null);
    if (written !== null && !written.ok) refuse(this.#notify, TAG_NOT_REMOVED, written.error);
  }

  async createTag(id: CaptureId, name: string): Promise<void> {
    if (this.#list.stored(id) === undefined) {
      refuse(this.#notify, TAG_NOT_ADDED, NOT_STORED);
      return;
    }

    const created = await this.#creating
      .run({ id: tagId(crypto.randomUUID()), name })
      .catch(() => null);
    if (created === null) return;

    const outcome = tagOutcome(created);
    if (outcome.kind === 'failed') {
      refuse(this.#notify, TAG_NOT_CREATED, outcome.failure);
      return;
    }

    const minted = outcome.tag;

    this.#cache.name(minted);
    await this.addTag(id, minted.id);
  }

  #fail(title: string, cause: unknown): void {
    this.#notify({ tone: 'danger', title, message: failureMessage(cause) });
  }
}

export { CaptureTags, tagOutcome };
export type { TagOutcome };
