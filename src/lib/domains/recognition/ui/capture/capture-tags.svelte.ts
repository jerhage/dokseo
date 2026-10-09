import { tagId } from '$lib/shared/ids';
import type { CaptureId, TagId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { addTagMutation, createTagMutation, removeTagMutation } from '../../queries/tag-queries';
import type { CaptureTagging, NewTag, TagWrites } from '../../queries/tag-queries';
import type { AddTagToCaptureResult } from '../../use-cases/tag/add-tag-to-capture';
import type { CreateTagResult } from '../../use-cases/tag/create-tag';
import type { RemoveTagFromCaptureResult } from '../../use-cases/tag/remove-tag-from-capture';
import type { CaptureCache } from './capture-cache';
import type { CaptureLookup } from './capture-list-rules';
import { tagOutcome } from './capture-tag-rules';
import { NOT_STORED, refuse } from './storage-failure';

const TAG_NOT_ADDED = 'The tag could not be added';

const TAG_NOT_REMOVED = 'The tag could not be removed';

const TAG_NOT_CREATED = 'The tag could not be created';

class CaptureTags {
  #notify: Notify;
  #cache: CaptureCache;
  #adding: WriteQuery<AddTagToCaptureResult, CaptureTagging>;
  #removing: WriteQuery<RemoveTagFromCaptureResult, CaptureTagging>;
  #creating: WriteQuery<CreateTagResult, NewTag>;

  constructor(
    recognition: Pick<TagWrites, 'addTagToCapture' | 'removeTagFromCapture' | 'createTag'>,
    notify: Notify,
    cache: CaptureCache,
  ) {
    this.#notify = notify;
    this.#cache = cache;
    this.#adding = writeQuery(() => ({
      ...addTagMutation(recognition),
      onSuccess: (written) => {
        if (written.kind === 'success') cache.put(written.capture);
      },
      onError: (cause) => this.#fail(TAG_NOT_ADDED, cause),
      onSettled: (_written, _cause, { capture }) => cache.refresh(capture.bookId),
    }));
    this.#removing = writeQuery(() => ({
      ...removeTagMutation(recognition),
      onSuccess: (written) => {
        if (written.kind === 'success') cache.put(written.capture);
      },
      onError: (cause) => this.#fail(TAG_NOT_REMOVED, cause),
      onSettled: (_written, _cause, { capture }) => cache.refresh(capture.bookId),
    }));
    this.#creating = writeQuery(() => ({
      ...createTagMutation(recognition),
      onSuccess: (created) => {
        if (created.kind === 'success') void cache.refreshTags();
      },
      onError: (cause) => this.#fail(TAG_NOT_CREATED, cause),
    }));
  }

  async addTag(id: CaptureId, tag: TagId, lookup: CaptureLookup): Promise<void> {
    const stored = lookup.stored(id);
    if (stored === undefined) {
      refuse(this.#notify, TAG_NOT_ADDED, NOT_STORED);
      return;
    }

    const written = await this.#adding.run({ capture: stored, tag }).catch(() => null);
    if (written !== null && written.kind !== 'success')
      refuse(this.#notify, TAG_NOT_ADDED, written);
  }

  async removeTag(id: CaptureId, tag: TagId, lookup: CaptureLookup): Promise<void> {
    const stored = lookup.stored(id);
    if (stored === undefined) {
      refuse(this.#notify, TAG_NOT_REMOVED, NOT_STORED);
      return;
    }

    const written = await this.#removing.run({ capture: stored, tag }).catch(() => null);
    if (written !== null && written.kind !== 'success') {
      refuse(this.#notify, TAG_NOT_REMOVED, written);
    }
  }

  async createTag(id: CaptureId, name: string, lookup: CaptureLookup): Promise<void> {
    if (lookup.stored(id) === undefined) {
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
    await this.addTag(id, minted.id, lookup);
  }

  #fail(title: string, cause: unknown): void {
    this.#notify({ tone: 'danger', title, message: failureMessage(cause) });
  }
}

export { CaptureTags };
