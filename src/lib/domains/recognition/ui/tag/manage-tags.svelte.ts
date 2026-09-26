import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { TagId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { tagName } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagColour } from '../../domain/tag/tag-colour';
import type { TagError } from '../../domain/tag/tag-repository';

const NAMELESS = 'A tag needs a name.';

const RENAME_FAILED = 'Could not rename that tag';

const RECOLOUR_FAILED = 'Could not recolour that tag';

const REMOVE_FAILED = 'Could not delete that tag';

const STORAGE_UNREACHABLE = 'Local storage could not be reached.';

function describeTagStorage(error: TagError): string {
  return match(error)
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so tags cannot be changed.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

class ManageTagsView {
  renaming = $state.raw<TagId | null>(null);
  draft = $state('');
  confirming = $state.raw<TagId | null>(null);
  invalid = $state.raw<string | null>(null);

  #container: Container;
  #notify: Notify;
  #reload: () => Promise<void>;
  #generation = 0;

  constructor(container: Container, notify: Notify, reload: () => Promise<void>) {
    this.#container = container;
    this.#notify = notify;
    this.#reload = reload;
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
    const written = await this.#container.recognition.renameTag(tag, this.draft).catch(() => null);

    if (generation !== this.#generation) return;

    if (written === null) {
      this.#fail(RENAME_FAILED, STORAGE_UNREACHABLE);
      return;
    }

    if (!written.ok) {
      match(written.error)
        .with({ kind: 'name-taken' }, (taken) => {
          this.invalid = `${taken.tag.name} already holds that name.`;
        })
        .with({ kind: 'storage-unavailable' }, { kind: 'storage-failed' }, (refused) => {
          this.#fail(RENAME_FAILED, describeTagStorage(refused));
        })
        .exhaustive();
      return;
    }

    this.renaming = null;
    this.draft = '';
    this.invalid = null;
    await this.#reload();
  }

  async recolour(tag: Tag, colour: TagColour): Promise<void> {
    const generation = ++this.#generation;
    const written = await this.#container.recognition.recolourTag(tag, colour).catch(() => null);

    if (generation !== this.#generation) return;

    if (written === null) {
      this.#fail(RECOLOUR_FAILED, STORAGE_UNREACHABLE);
      return;
    }

    if (!written.ok) {
      this.#fail(RECOLOUR_FAILED, describeTagStorage(written.error));
      return;
    }

    this.invalid = null;
    await this.#reload();
  }

  async remove(tag: Tag): Promise<void> {
    const generation = ++this.#generation;
    const stripped = await this.#container.recognition.deleteTag(tag.id).catch(() => null);

    if (generation !== this.#generation) return;

    if (stripped === null) {
      this.#fail(REMOVE_FAILED, STORAGE_UNREACHABLE);
      return;
    }

    if (!stripped.ok) {
      this.#fail(REMOVE_FAILED, describeTagStorage(stripped.error));
      return;
    }

    this.confirming = null;
    this.invalid = null;
    await this.#reload();
  }

  #fail(title: string, message: string): void {
    this.#notify({ tone: 'danger', title, message });
  }
}

export { ManageTagsView, NAMELESS, RENAME_FAILED, RECOLOUR_FAILED, REMOVE_FAILED };
