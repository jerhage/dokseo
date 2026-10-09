import type { CaptureId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { editedText } from '../../domain/capture/capture';
import type { NotableCapture } from '../../domain/capture/capture';
import { editTextMutation, writeCaptureNoteMutation } from '../../queries/capture-queries';
import type { CaptureWrites, NoteEdit, TextEdit } from '../../queries/capture-queries';
import type { CaptureCache } from './capture-cache';
import type { EditCaptureTextResult } from '../../use-cases/capture/edit-capture-text';
import type { WriteCaptureNoteResult } from '../../use-cases/capture/write-capture-note';
import type { CaptureLookup } from './capture-list-rules';
import { NOT_STORED, refuse } from './storage-failure';
import type { WriteOutcome } from './storage-failure';

const TEXT_NOT_SAVED = 'The text could not be saved';

const NOTE_NOT_SAVED = 'The note could not be saved';

class CaptureEdits {
  #notify: Notify;
  #editing: WriteQuery<EditCaptureTextResult, TextEdit>;
  #noting: WriteQuery<WriteCaptureNoteResult<NotableCapture>, NoteEdit>;

  constructor(recognition: CaptureWrites, notify: Notify, cache: CaptureCache) {
    this.#notify = notify;
    this.#editing = writeQuery(() => ({
      ...editTextMutation(recognition),
      onSuccess: (written) => {
        if (written.kind === 'success') cache.put(written.capture);
      },
      onError: (cause) => this.#fail(TEXT_NOT_SAVED, cause),
      onSettled: (_written, _cause, { capture }) => cache.refresh(capture.bookId),
    }));
    this.#noting = writeQuery(() => ({
      ...writeCaptureNoteMutation(recognition),
      onSuccess: (written) => {
        if (written.kind === 'success') cache.put(written.capture);
      },
      onError: (cause) => this.#fail(NOTE_NOT_SAVED, cause),
      onSettled: (_written, _cause, { capture }) => cache.refresh(capture.bookId),
    }));
  }

  async edit(id: CaptureId, text: string, lookup: CaptureLookup): Promise<WriteOutcome> {
    const card = lookup.cards.find((capture) => capture.id === id);
    if (card === undefined || card.status !== 'done') return 'saved';

    const settled = editedText(card.text.text, text, card.origin);
    if (settled === card.text.text) return 'saved';

    const stored = lookup.stored(id);
    if (stored === undefined) return refuse(this.#notify, TEXT_NOT_SAVED, NOT_STORED);

    const written = await this.#editing.run({ capture: stored, text: settled }).catch(() => null);
    return this.#outcome(TEXT_NOT_SAVED, written);
  }

  async annotate(id: CaptureId, note: string, lookup: CaptureLookup): Promise<WriteOutcome> {
    const stored = lookup.stored(id);
    if (stored?.origin === 'written') return 'saved';
    if (!lookup.cards.some((capture) => capture.id === id)) return 'saved';
    if (stored === undefined) return refuse(this.#notify, NOTE_NOT_SAVED, NOT_STORED);

    const written = await this.#noting.run({ capture: stored, note }).catch(() => null);
    return this.#outcome(NOTE_NOT_SAVED, written);
  }

  #outcome(
    title: string,
    written: EditCaptureTextResult | WriteCaptureNoteResult<NotableCapture> | null,
  ): WriteOutcome {
    if (written === null) return 'failed';
    if (written.kind !== 'success') return refuse(this.#notify, title, written);

    return 'saved';
  }

  #fail(title: string, cause: unknown): void {
    this.#notify({ tone: 'danger', title, message: failureMessage(cause) });
  }
}

export { CaptureEdits, NOTE_NOT_SAVED, TEXT_NOT_SAVED };
