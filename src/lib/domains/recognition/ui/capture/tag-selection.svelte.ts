import type { CaptureId, TagId } from '$lib/shared/ids';
import { TagPicker } from './tag-picker.svelte';
import type { PickerRow, PickerTags } from './tag-picker.svelte';

type TagWriting = {
  readonly tagsOn: (capture: CaptureId) => readonly TagId[];
  readonly loadCounts: () => Promise<void>;
  readonly add: (capture: CaptureId, tag: TagId) => Promise<void>;
  readonly remove: (capture: CaptureId, tag: TagId) => Promise<void>;
  readonly create: (capture: CaptureId, name: string) => Promise<void>;
};

class TagSelection {
  #writing: TagWriting;
  #picker: TagPicker;
  #countsAsked = false;

  constructor(writing: TagWriting, tags: () => PickerTags) {
    this.#writing = writing;
    this.#picker = new TagPicker(tags);
  }

  get picker(): TagPicker {
    return this.#picker;
  }

  opened(capture: CaptureId): boolean {
    return this.#picker.capture === capture;
  }

  open(capture: CaptureId): void {
    if (!this.#countsAsked) {
      this.#countsAsked = true;
      void this.#writing.loadCounts();
    }

    this.#picker.open(capture, this.#writing.tagsOn(capture));
  }

  close(): void {
    this.#picker.close();
  }

  async choose(row: PickerRow): Promise<void> {
    const capture = this.#picker.capture;
    if (capture === null) return;

    if (row.kind === 'create') await this.#writing.create(capture, row.name);
    else await this.#writing.add(capture, row.tag.id);

    if (this.#picker.capture === capture) this.#picker.open(capture, this.#writing.tagsOn(capture));
  }

  async drop(capture: CaptureId, tag: TagId): Promise<void> {
    await this.#writing.remove(capture, tag);
  }
}

export { TagSelection };
export type { TagWriting };
