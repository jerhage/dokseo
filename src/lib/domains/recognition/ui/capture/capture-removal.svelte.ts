import type { CaptureId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { Capture } from '../../domain/capture/capture';
import { removeCaptureMutation, restoreCaptureMutation } from '../../queries/capture-queries';
import type { CaptureWrites } from '../../queries/capture-queries';
import type { CaptureCache } from './capture-cache';
import type { RemoveCaptureResult } from '../../use-cases/capture/remove-capture';
import type { RestoreCaptureResult } from '../../use-cases/capture/restore-capture';
import type { CaptureLookup } from './capture-list-rules';
import { refuse } from './storage-failure';
import type { WriteOutcome } from './storage-failure';

const CAPTURE_REMOVED = 'Capture removed';

const REMOVE_FAILED = 'The capture could not be removed';

const RESTORE_FAILED = 'The capture could not be restored';

class CaptureRemoval {
  #notify: Notify;
  #removing: WriteQuery<RemoveCaptureResult, Capture>;
  #restoring: WriteQuery<RestoreCaptureResult, Capture>;

  constructor(recognition: CaptureWrites, notify: Notify, cache: CaptureCache) {
    this.#notify = notify;
    this.#removing = writeQuery(() => ({
      ...removeCaptureMutation(recognition),
      onMutate: async (capture) => {
        await cache.cancel(capture.bookId);
        cache.drop(capture);
      },
      onSuccess: (gone, capture) => {
        if (gone.kind !== 'success') cache.put(capture);
      },
      onError: (cause, capture) => {
        cache.put(capture);
        this.#fail(REMOVE_FAILED, cause);
      },
      onSettled: (_gone, _cause, capture) => cache.refresh(capture.bookId),
    }));
    this.#restoring = writeQuery(() => ({
      ...restoreCaptureMutation(recognition),
      onSuccess: (restored, capture) => {
        if (restored.kind === 'success') cache.put(capture);
      },
      onError: (cause) => this.#fail(RESTORE_FAILED, cause),
      onSettled: (_restored, _cause, capture) => cache.refresh(capture.bookId),
    }));
  }

  async remove(id: CaptureId, lookup: CaptureLookup): Promise<WriteOutcome> {
    const stored = lookup.stored(id);
    if (stored === undefined) return 'saved';

    const gone = await this.#removing.run(stored).catch(() => null);
    if (gone === null) return 'failed';
    if (gone.kind !== 'success') return refuse(this.#notify, REMOVE_FAILED, gone);

    this.#notify({
      tone: 'success',
      title: CAPTURE_REMOVED,
      action: { label: 'Undo', run: () => void this.#undo(stored) },
      duration: ACTION_NOTICE_MS,
    });
    return 'saved';
  }

  async #undo(stored: Capture): Promise<void> {
    const restored = await this.#restoring.run(stored).catch(() => null);
    if (restored !== null && restored.kind !== 'success') {
      refuse(this.#notify, RESTORE_FAILED, restored);
    }
  }

  #fail(title: string, cause: unknown): void {
    this.#notify({ tone: 'danger', title, message: failureMessage(cause) });
  }
}

export { CAPTURE_REMOVED, CaptureRemoval, REMOVE_FAILED, RESTORE_FAILED };
