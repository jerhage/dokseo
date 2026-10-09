import { useQueryClient } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { TagId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { tagName } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagColour } from '../../domain/tag/tag-colour';
import { recognitionKeys } from '../../queries/recognition-keys';
import {
  deleteTagMutation,
  recolourTagMutation,
  renameTagMutation,
} from '../../queries/tag-queries';
import type { TagRecolour, TagRename, TagWrites } from '../../queries/tag-queries';
import type { DeleteTagResult } from '../../use-cases/tag/delete-tag';
import type { RecolourTagResult } from '../../use-cases/tag/recolour-tag';
import type { RenameTagResult } from '../../use-cases/tag/rename-tag';
import type { RecolourOutcome, RemoveOutcome, RenameOutcome } from './manage-tags-rules';

const RENAME_FAILED = 'Could not rename that tag';

const RECOLOUR_FAILED = 'Could not recolour that tag';

const REMOVE_FAILED = 'Could not delete that tag';

const TAGS_UNCHANGEABLE = 'This browser blocks local storage, so tags cannot be changed.';

const UNCHANGED = { kind: 'unchanged' } as const;

class ManageTags {
  #notify: Notify;
  #generation = 0;
  #renaming: WriteQuery<RenameTagResult, TagRename>;
  #recolouring: WriteQuery<RecolourTagResult, TagRecolour>;
  #removing: WriteQuery<DeleteTagResult, TagId>;

  constructor(
    recognition: Pick<TagWrites, 'renameTag' | 'recolourTag' | 'deleteTag'>,
    notify: Notify,
  ) {
    const client = useQueryClient();
    const refresh = (written: { readonly kind: string }): void => {
      if (written.kind !== 'success') return;
      void client.invalidateQueries({ queryKey: recognitionKeys.tags() });
      void client.invalidateQueries({ queryKey: recognitionKeys.everyCapture() });
    };
    this.#notify = notify;
    this.#renaming = writeQuery(() => ({
      ...renameTagMutation(recognition),
      onSuccess: refresh,
      onError: (cause) => this.#fail(RENAME_FAILED, failureMessage(cause)),
    }));
    this.#recolouring = writeQuery(() => ({
      ...recolourTagMutation(recognition),
      onSuccess: refresh,
      onError: (cause) => this.#fail(RECOLOUR_FAILED, failureMessage(cause)),
    }));
    this.#removing = writeQuery(() => ({
      ...deleteTagMutation(recognition),
      onSuccess: refresh,
      onError: (cause) => this.#fail(REMOVE_FAILED, failureMessage(cause)),
    }));
  }

  async rename(tag: Tag, name: string): Promise<RenameOutcome> {
    if (tagName(name).length === 0) return { kind: 'nameless' };

    const generation = ++this.#generation;
    const written = await this.#renaming.run({ tag, name }).catch(() => null);

    if (generation !== this.#generation) return UNCHANGED;

    if (written === null) return UNCHANGED;

    return match<RenameTagResult, RenameOutcome>(written)
      .with({ kind: 'success' }, () => ({ kind: 'renamed' }))
      .with({ kind: 'name-taken' }, (taken) => ({ kind: 'name-taken', holder: taken.tag.name }))
      .with({ kind: 'storage-unavailable' }, () => {
        this.#fail(RENAME_FAILED, TAGS_UNCHANGEABLE);
        return UNCHANGED;
      })
      .exhaustive();
  }

  async recolour(tag: Tag, colour: TagColour): Promise<RecolourOutcome> {
    const generation = ++this.#generation;
    const written = await this.#recolouring.run({ tag, colour }).catch(() => null);

    if (generation !== this.#generation) return UNCHANGED;

    if (written === null) return UNCHANGED;

    if (written.kind !== 'success') {
      this.#fail(RECOLOUR_FAILED, TAGS_UNCHANGEABLE);
      return UNCHANGED;
    }

    return { kind: 'recoloured' };
  }

  async remove(tag: Tag): Promise<RemoveOutcome> {
    const generation = ++this.#generation;
    const stripped = await this.#removing.run(tag.id).catch(() => null);

    if (generation !== this.#generation) return UNCHANGED;

    if (stripped === null) return UNCHANGED;

    if (stripped.kind !== 'success') {
      this.#fail(REMOVE_FAILED, TAGS_UNCHANGEABLE);
      return UNCHANGED;
    }

    return { kind: 'removed' };
  }

  #fail(title: string, message: string): void {
    this.#notify({ tone: 'danger', title, message });
  }
}

export { ManageTags, RECOLOUR_FAILED, REMOVE_FAILED, RENAME_FAILED, TAGS_UNCHANGEABLE };
