import type { Container } from '$lib/container';
import type { Notify } from '$lib/shared/notice';
import { CaptureEdits } from './capture-edits.svelte';
import { CaptureList } from './capture-list.svelte';
import { CaptureRecording } from './capture-recording.svelte';
import type { NoteEditors } from './capture-recording.svelte';
import { CaptureRemoval } from './capture-removal.svelte';
import { CaptureTags } from './capture-tags.svelte';
import { ClearAll } from './clear-all.svelte';

class CaptureCollection {
  readonly list: CaptureList;
  readonly clearAll: ClearAll;
  readonly removal: CaptureRemoval;
  readonly edits: CaptureEdits;
  readonly tagging: CaptureTags;
  readonly recording: CaptureRecording;

  constructor(container: Container, notify: Notify, editors: NoteEditors) {
    this.list = new CaptureList(container, (tags) => this.tagging.adopt(tags));
    this.clearAll = new ClearAll(container, notify, this.list);
    this.removal = new CaptureRemoval(container, notify, this.list);
    this.edits = new CaptureEdits(container, notify, this.list);
    this.tagging = new CaptureTags(container, notify, this.list);
    this.recording = new CaptureRecording(container, notify, this.list, editors);
  }
}

export { CaptureCollection };
