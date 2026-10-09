import type { CaptureId, TagId } from '$lib/shared/ids';
import type { FocusTarget } from './focus-target';
import type { PickerRow } from './tag-picker-rules';
import { createTagPicker } from './tag-picker.svelte';

type TagWriting = {
  readonly tagsOn: (capture: CaptureId) => readonly TagId[];
  readonly loadCounts: () => void;
  readonly add: (capture: CaptureId, tag: TagId) => Promise<void>;
  readonly remove: (capture: CaptureId, tag: TagId) => Promise<void>;
  readonly create: (capture: CaptureId, name: string) => Promise<void>;
};

function createTagSelection() {
  const picker = createTagPicker();
  let countsAsked = false;
  let opener: FocusTarget | null = null;

  return {
    get picker() {
      return picker;
    },
    opened(capture: CaptureId): boolean {
      return picker.capture === capture;
    },
    open(capture: CaptureId, writing: TagWriting, from: FocusTarget | null): void {
      if (!countsAsked) {
        countsAsked = true;
        writing.loadCounts();
      }

      opener = from;
      picker.open(capture, writing.tagsOn(capture));
    },
    close(): FocusTarget | null {
      if (picker.capture === null) return null;

      picker.close();
      const from = opener;
      opener = null;
      return from;
    },
    async choose(row: PickerRow, writing: TagWriting): Promise<void> {
      const capture = picker.capture;
      if (capture === null) return;

      if (row.kind === 'create') await writing.create(capture, row.name);
      else await writing.add(capture, row.tag.id);

      if (picker.capture === capture) picker.open(capture, writing.tagsOn(capture));
    },
  };
}

type TagSelectionHook = ReturnType<typeof createTagSelection>;

export { createTagSelection };
export type { TagSelectionHook, TagWriting };
