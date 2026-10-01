import type { Container } from '$lib/container';
import type { CaptureId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import { err } from '$lib/shared/result';
import { editedText } from '../../domain/capture/capture';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { CaptureList } from './capture-list.svelte';
import { NOT_STORED, refuse, thrownFailure } from './storage-failure';
import type { WriteOutcome } from './storage-failure';

class CaptureEdits {
  #container: Container;
  #notify: Notify;
  #list: CaptureList;

  constructor(container: Container, notify: Notify, list: CaptureList) {
    this.#container = container;
    this.#notify = notify;
    this.#list = list;
  }

  async edit(id: CaptureId, text: string): Promise<WriteOutcome> {
    const card = this.#list.captures.find((capture) => capture.id === id);
    if (card === undefined || card.status !== 'done') return 'saved';

    const settled = editedText(card.text.text, text, card.origin);
    if (settled === card.text.text) return 'saved';

    const generation = this.#list.generation;
    const stored = this.#list.stored(id);
    const written =
      stored === undefined
        ? err(NOT_STORED)
        : await this.#container.recognition.editCaptureText(stored, settled).catch(thrownFailure);

    if (generation !== this.#list.generation) return 'saved';
    if (!written.ok) return refuse(this.#notify, 'The text could not be saved', written.error);

    this.#list.keep(written.value);
    this.#list.change(id, (capture) =>
      capture.status === 'done'
        ? { ...capture, text: recognizedText(settled, capture.text.confidence), edited: true }
        : capture,
    );
    return 'saved';
  }

  async annotate(id: CaptureId, note: string): Promise<WriteOutcome> {
    const stored = this.#list.stored(id);
    if (stored?.origin === 'written') return 'saved';
    if (!this.#list.captures.some((capture) => capture.id === id)) return 'saved';

    const generation = this.#list.generation;
    const written =
      stored === undefined
        ? err(NOT_STORED)
        : await this.#container.recognition.writeCaptureNote(stored, note).catch(thrownFailure);

    if (generation !== this.#list.generation) return 'saved';
    if (!written.ok) return refuse(this.#notify, 'The note could not be saved', written.error);

    this.#list.keep(written.value);
    const kept = written.value.note;
    this.#list.change(id, (capture) =>
      capture.origin !== 'written' ? { ...capture, note: kept } : capture,
    );
    return 'saved';
  }
}

export { CaptureEdits };
