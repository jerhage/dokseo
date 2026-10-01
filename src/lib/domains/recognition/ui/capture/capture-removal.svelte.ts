import type { Container } from '$lib/container';
import type { CaptureId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
import type { Capture } from '../../domain/capture/capture';
import type { CaptureList, Removed } from './capture-list.svelte';
import { refuse, thrownFailure } from './storage-failure';
import type { WriteOutcome } from './storage-failure';

const CAPTURE_REMOVED = 'Capture removed';

const RESTORE_FAILED = 'The capture could not be restored';

class CaptureRemoval {
  #container: Container;
  #notify: Notify;
  #list: CaptureList;

  constructor(container: Container, notify: Notify, list: CaptureList) {
    this.#container = container;
    this.#notify = notify;
    this.#list = list;
  }

  async remove(id: CaptureId): Promise<WriteOutcome> {
    const removed = this.#list.take(id);
    if (removed === null || removed.stored === undefined) return 'saved';

    const stored = removed.stored;
    const generation = this.#list.generation;
    const gone = await this.#container.recognition.removeCapture(id).catch(thrownFailure);
    if (generation !== this.#list.generation) return 'saved';
    if (gone.ok) {
      this.#notify({
        tone: 'success',
        title: CAPTURE_REMOVED,
        action: { label: 'Undo', run: () => void this.#undo(removed, stored, generation) },
        duration: ACTION_NOTICE_MS,
      });
      return 'saved';
    }

    this.#list.putBack(removed);
    return refuse(this.#notify, 'The capture could not be removed', gone.error);
  }

  async #undo(removed: Removed, stored: Capture, generation: number): Promise<void> {
    const restored = await this.#container.recognition.restoreCapture(stored).catch(thrownFailure);
    if (!restored.ok) {
      refuse(this.#notify, RESTORE_FAILED, restored.error);
      return;
    }
    if (generation !== this.#list.generation) return;

    this.#list.putBack(removed);
  }
}

export { CAPTURE_REMOVED, CaptureRemoval, RESTORE_FAILED };
