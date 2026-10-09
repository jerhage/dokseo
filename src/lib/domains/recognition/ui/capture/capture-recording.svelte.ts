import type { Container } from '$lib/container';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { TextQuote } from '$lib/shared/anchor';
import { captureId } from '$lib/shared/ids';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import { recognizedText } from '../../domain/engine/recognized-text';
import { saveCaptureMutation, writeNoteMutation } from '../../queries/capture-queries';
import type { NoteRequest } from '../../queries/capture-queries';
import type { CaptureCache } from './capture-cache';
import type { SaveCaptureResult } from '../../use-cases/capture/save-capture';
import type { WriteNoteResult } from '../../use-cases/capture/write-note';
import { liftStart, noteStart } from './capture-recording-rules';
import type { Settled } from './panel-capture';
import { describeStorageFailure } from './storage-failure';
import { UnsavedCards } from './unsaved-cards.svelte';

const CAPTURE_NOT_SAVED = 'The capture could not be saved';

const NOTE_NOT_WRITTEN = 'The note could not be saved';

type NoteEditors = {
  readonly open: (capture: CaptureId) => void;
  readonly close: (capture: CaptureId) => void;
};

class CaptureRecording {
  readonly unsaved = new UnsavedCards();

  #container: Container;
  #notify: Notify;
  #cache: CaptureCache;
  #editors: NoteEditors;
  #saving: WriteQuery<SaveCaptureResult, CaptureDraft>;
  #writing: WriteQuery<WriteNoteResult, NoteRequest>;

  constructor(container: Container, notify: Notify, cache: CaptureCache, editors: NoteEditors) {
    const recognition = container.recognition;
    this.#container = container;
    this.#notify = notify;
    this.#cache = cache;
    this.#editors = editors;
    this.#saving = writeQuery(() => ({
      ...saveCaptureMutation(recognition),
      onSuccess: (kept, { id }) => {
        if (kept.kind === 'success') this.#stored(kept.capture);
        else this.#unsaved(id, CAPTURE_NOT_SAVED, describeStorageFailure(kept));
      },
      onError: (cause, { id }) => this.#unsaved(id, CAPTURE_NOT_SAVED, failureMessage(cause)),
      onSettled: (_kept, _cause, { bookId }) => cache.refresh(bookId),
    }));
    this.#writing = writeQuery(() => ({
      ...writeNoteMutation(recognition),
      onSuccess: (written, { id }) => {
        if (written.kind === 'success') this.#stored(written.capture);
        else this.#noteUnsaved(id, describeStorageFailure(written));
      },
      onError: (cause, { id }) => this.#noteUnsaved(id, failureMessage(cause)),
      onSettled: (_written, _cause, { book }) => cache.refresh(book),
    }));
  }

  note(book: BookId | null, regions: readonly ImageRegion[]): void {
    const trace = this.#container.beginTrace('note');
    try {
      const start = noteStart(regions, book);
      if (start.kind === 'stopped') {
        trace.step('stopped', { guard: start.guard });
        return;
      }

      trace.step('dispatched', { regions: regions.length });
      void this.write(start.book, regions);
    } finally {
      trace.end();
    }
  }

  lift(book: BookId | null, cfi: string, quote: TextQuote, chapter: string | null): void {
    const trace = this.#container.beginTrace('lift');
    try {
      const start = liftStart(quote, book);
      if (start.kind === 'stopped') {
        trace.step('stopped', { guard: start.guard });
        return;
      }

      trace.step('dispatched', { characters: quote.exact.length });
      void this.keepLifted(start.book, cfi, quote, chapter);
    } finally {
      trace.end();
    }
  }

  async keepLifted(
    book: BookId,
    cfi: string,
    quote: TextQuote,
    chapter: string | null,
  ): Promise<void> {
    const id = captureId(crypto.randomUUID());
    const anchor = textAnchor(cfi, quote, chapter);
    const text = recognizedText(quote.exact, null);
    this.unsaved.put({
      id,
      anchor,
      origin: 'lifted',
      note: null,
      tagIds: [],
      status: 'done',
      text,
      edited: false,
    });

    await this.#keep({ id, bookId: book, anchor, text: text.text, origin: 'lifted' });
  }

  async write(book: BookId, regions: readonly ImageRegion[]): Promise<void> {
    const id = captureId(crypto.randomUUID());
    const anchor = regionAnchor(regions);
    this.unsaved.put({
      id,
      anchor,
      origin: 'written',
      tagIds: [],
      status: 'done',
      text: recognizedText('', null),
      edited: false,
    });
    this.#editors.open(id);

    await this.#writing.run({ id, book, anchor }).catch(() => null);
  }

  async recognizing(
    book: BookId | null,
    regions: readonly ImageRegion[],
    reading: () => Promise<Settled>,
  ): Promise<void> {
    const id = captureId(crypto.randomUUID());
    const anchor = regionAnchor(regions);
    this.unsaved.put({
      id,
      anchor,
      origin: 'recognized',
      note: null,
      tagIds: [],
      status: 'pending',
    });

    const settled = await reading();

    this.unsaved.settle(id, settled);
    if (book === null || settled.status !== 'done') return;

    await this.#keep({
      id,
      bookId: book,
      anchor,
      text: settled.text.text,
      confidence: settled.text.confidence,
      origin: 'recognized',
    });
  }

  async #keep(draft: CaptureDraft): Promise<void> {
    await this.#saving.run(draft).catch(() => null);
  }

  #stored(capture: Capture): void {
    this.#cache.put(capture);
    if (this.#cache.holds(capture)) this.unsaved.drop(capture.id);
  }

  #noteUnsaved(id: CaptureId, reason: string): void {
    if (!this.unsaved.holds(id)) return;

    this.#editors.close(id);
    this.#unsaved(id, NOTE_NOT_WRITTEN, reason);
  }

  #unsaved(id: CaptureId, title: string, reason: string): void {
    if (!this.unsaved.holds(id)) return;

    this.unsaved.settle(id, { status: 'failed', message: `Not saved. ${reason}` });
    this.#notify({ tone: 'danger', title, message: reason });
  }
}

export { CaptureRecording };
export type { NoteEditors };
