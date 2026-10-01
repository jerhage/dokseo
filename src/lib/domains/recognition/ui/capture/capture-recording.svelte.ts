import type { Container } from '$lib/container';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { TextQuote } from '$lib/shared/anchor';
import { captureId } from '$lib/shared/ids';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Notify } from '$lib/shared/notice';
import { failureMessage } from '$lib/shared/query-failure';
import type { Result } from '$lib/shared/result';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import type { CaptureError } from '../../domain/capture/capture-repository';
import { recognizedText } from '../../domain/engine/recognized-text';
import { saveCaptureMutation, writeNoteMutation } from '../../queries/capture-queries';
import type { NoteRequest } from '../../queries/capture-queries';
import type { CaptureCache } from './capture-cache';
import type { CaptureList } from './capture-list.svelte';
import type { Settled } from './panel-capture';
import { describeStorageFailure } from './storage-failure';

const CAPTURE_NOT_SAVED = 'The capture could not be saved';

const NOTE_NOT_WRITTEN = 'The note could not be saved';

type NoteEditors = {
  readonly open: (capture: CaptureId) => void;
  readonly close: (capture: CaptureId) => void;
};

class CaptureRecording {
  #container: Container;
  #notify: Notify;
  #list: CaptureList;
  #cache: CaptureCache;
  #editors: NoteEditors;
  #saving: WriteQuery<Result<Capture, CaptureError>, CaptureDraft>;
  #writing: WriteQuery<Result<Capture, CaptureError>, NoteRequest>;

  constructor(
    container: Container,
    notify: Notify,
    list: CaptureList,
    cache: CaptureCache,
    editors: NoteEditors,
  ) {
    const recognition = container.recognition;
    this.#container = container;
    this.#notify = notify;
    this.#list = list;
    this.#cache = cache;
    this.#editors = editors;
    this.#saving = writeQuery(() => ({
      ...saveCaptureMutation(recognition),
      onSuccess: (kept, { id }) => {
        if (kept.ok) this.#stored(kept.value);
        else this.#unsaved(id, CAPTURE_NOT_SAVED, describeStorageFailure(kept.error));
      },
      onError: (cause, { id }) => this.#unsaved(id, CAPTURE_NOT_SAVED, failureMessage(cause)),
      onSettled: (_kept, _cause, { bookId }) => cache.refresh(bookId),
    }));
    this.#writing = writeQuery(() => ({
      ...writeNoteMutation(recognition),
      onSuccess: (written, { id }) => {
        if (written.ok) this.#stored(written.value);
        else this.#noteUnsaved(id, describeStorageFailure(written.error));
      },
      onError: (cause, { id }) => this.#noteUnsaved(id, failureMessage(cause)),
      onSettled: (_written, _cause, { book }) => cache.refresh(book),
    }));
  }

  note(regions: readonly ImageRegion[]): void {
    const book = this.#list.book;
    const trace = this.#container.beginTrace('note');
    try {
      if (regions.length === 0) {
        trace.step('stopped', { guard: 'no-regions' });
        return;
      }

      if (book === null) {
        trace.step('stopped', { guard: 'no-open-book' });
        return;
      }

      trace.step('dispatched', { regions: regions.length });
      void this.write(book, regions);
    } finally {
      trace.end();
    }
  }

  lift(cfi: string, quote: TextQuote, chapter: string | null): void {
    const book = this.#list.book;
    const trace = this.#container.beginTrace('lift');
    try {
      if (quote.exact.trim().length === 0) {
        trace.step('stopped', { guard: 'nothing-selected' });
        return;
      }

      if (book === null) {
        trace.step('stopped', { guard: 'no-open-book' });
        return;
      }

      trace.step('dispatched', { characters: quote.exact.length });
      void this.keepLifted(book, cfi, quote, chapter);
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
    this.#list.unsaved.put({
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
    this.#list.unsaved.put({
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
    regions: readonly ImageRegion[],
    reading: () => Promise<Settled>,
  ): Promise<void> {
    const book = this.#list.book;
    const id = captureId(crypto.randomUUID());
    const anchor = regionAnchor(regions);
    this.#list.unsaved.put({
      id,
      anchor,
      origin: 'recognized',
      note: null,
      tagIds: [],
      status: 'pending',
    });

    const settled = await reading();

    this.#list.unsaved.settle(id, settled);
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
    if (this.#cache.holds(capture)) this.#list.unsaved.drop(capture.id);
  }

  #noteUnsaved(id: CaptureId, reason: string): void {
    if (!this.#list.unsaved.holds(id)) return;

    this.#editors.close(id);
    this.#unsaved(id, NOTE_NOT_WRITTEN, reason);
  }

  #unsaved(id: CaptureId, title: string, reason: string): void {
    if (!this.#list.unsaved.holds(id)) return;

    this.#list.unsaved.settle(id, { status: 'failed', message: `Not saved. ${reason}` });
    this.#notify({ tone: 'danger', title, message: reason });
  }
}

export { CaptureRecording };
export type { NoteEditors };
