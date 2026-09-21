import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { TagId } from '$lib/shared/ids';
import { tagName } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagColour } from '../../domain/tag/tag-colour';

const NAMELESS = 'A tag needs a name.';

const RENAME_FAILED = 'That tag could not be renamed.';

const RECOLOUR_FAILED = 'That tag could not be recoloured.';

const REMOVE_FAILED = 'That tag could not be deleted.';

class ManageTagsView {
  renaming = $state.raw<TagId | null>(null);
  draft = $state('');
  confirming = $state.raw<TagId | null>(null);
  failure = $state.raw<string | null>(null);

  #container: Container;
  #reload: () => Promise<void>;
  #generation = 0;

  constructor(container: Container, reload: () => Promise<void>) {
    this.#container = container;
    this.#reload = reload;
  }

  startRename(tag: Tag): void {
    this.renaming = tag.id;
    this.draft = tag.name;
    this.confirming = null;
    this.failure = null;
  }

  abandonRename(): void {
    this.renaming = null;
    this.draft = '';
    this.failure = null;
  }

  askRemove(tag: Tag): void {
    this.confirming = tag.id;
    this.renaming = null;
    this.draft = '';
    this.failure = null;
  }

  dismissRemove(): void {
    this.confirming = null;
  }

  async rename(tag: Tag): Promise<void> {
    if (tagName(this.draft).length === 0) {
      this.failure = NAMELESS;
      return;
    }

    const generation = ++this.#generation;
    const written = await this.#container.recognition.renameTag(tag, this.draft).catch(() => null);

    if (generation !== this.#generation) return;

    if (written === null) {
      this.failure = RENAME_FAILED;
      return;
    }

    if (!written.ok) {
      this.failure = match(written.error)
        .with({ kind: 'name-taken' }, (taken) => `${taken.tag.name} already holds that name.`)
        .with({ kind: 'storage-unavailable' }, { kind: 'storage-failed' }, () => RENAME_FAILED)
        .exhaustive();
      return;
    }

    this.renaming = null;
    this.draft = '';
    this.failure = null;
    await this.#reload();
  }

  async recolour(tag: Tag, colour: TagColour): Promise<void> {
    const generation = ++this.#generation;
    const written = await this.#container.recognition.recolourTag(tag, colour).catch(() => null);

    if (generation !== this.#generation) return;

    if (written === null || !written.ok) {
      this.failure = RECOLOUR_FAILED;
      return;
    }

    this.failure = null;
    await this.#reload();
  }

  async remove(tag: Tag): Promise<void> {
    const generation = ++this.#generation;
    const stripped = await this.#container.recognition.deleteTag(tag.id).catch(() => null);

    if (generation !== this.#generation) return;

    if (stripped === null || !stripped.ok) {
      this.failure = REMOVE_FAILED;
      return;
    }

    this.confirming = null;
    this.failure = null;
    await this.#reload();
  }
}

export { ManageTagsView, NAMELESS, RENAME_FAILED, RECOLOUR_FAILED, REMOVE_FAILED };
