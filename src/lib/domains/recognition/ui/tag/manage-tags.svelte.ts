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

const NAMELESS = 'A tag needs a name.';

const RENAME_FAILED = 'Could not rename that tag';

const RECOLOUR_FAILED = 'Could not recolour that tag';

const REMOVE_FAILED = 'Could not delete that tag';

const TAGS_UNCHANGEABLE = 'This browser blocks local storage, so tags cannot be changed.';

class ManageTagsView {
  renaming = $state.raw<TagId | null>(null);
  draft = $state('');
  confirming = $state.raw<TagId | null>(null);
  invalid = $state.raw<string | null>(null);

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

  startRename(tag: Tag): void {
    this.renaming = tag.id;
    this.draft = tag.name;
    this.confirming = null;
    this.invalid = null;
  }

  abandonRename(): void {
    this.renaming = null;
    this.draft = '';
    this.invalid = null;
  }

  askRemove(tag: Tag): void {
    this.confirming = tag.id;
    this.renaming = null;
    this.draft = '';
    this.invalid = null;
  }

  dismissRemove(): void {
    this.confirming = null;
  }

  async rename(tag: Tag): Promise<void> {
    if (tagName(this.draft).length === 0) {
      this.invalid = NAMELESS;
      return;
    }

    const generation = ++this.#generation;
    const written = await this.#renaming.run({ tag, name: this.draft }).catch(() => null);

    if (generation !== this.#generation) return;

    if (written === null) return;

    match(written)
      .with({ kind: 'success' }, () => {
        this.renaming = null;
        this.draft = '';
        this.invalid = null;
      })
      .with({ kind: 'name-taken' }, (taken) => {
        this.invalid = `${taken.tag.name} already holds that name.`;
      })
      .with({ kind: 'storage-unavailable' }, () => {
        this.#fail(RENAME_FAILED, TAGS_UNCHANGEABLE);
      })
      .exhaustive();
  }

  async recolour(tag: Tag, colour: TagColour): Promise<void> {
    const generation = ++this.#generation;
    const written = await this.#recolouring.run({ tag, colour }).catch(() => null);

    if (generation !== this.#generation) return;

    if (written === null) return;

    if (written.kind !== 'success') {
      this.#fail(RECOLOUR_FAILED, TAGS_UNCHANGEABLE);
      return;
    }

    this.invalid = null;
  }

  async remove(tag: Tag): Promise<void> {
    const generation = ++this.#generation;
    const stripped = await this.#removing.run(tag.id).catch(() => null);

    if (generation !== this.#generation) return;

    if (stripped === null) return;

    if (stripped.kind !== 'success') {
      this.#fail(REMOVE_FAILED, TAGS_UNCHANGEABLE);
      return;
    }

    this.confirming = null;
    this.invalid = null;
  }

  #fail(title: string, message: string): void {
    this.#notify({ tone: 'danger', title, message });
  }
}

export {
  ManageTagsView,
  NAMELESS,
  RENAME_FAILED,
  RECOLOUR_FAILED,
  REMOVE_FAILED,
  TAGS_UNCHANGEABLE,
};
