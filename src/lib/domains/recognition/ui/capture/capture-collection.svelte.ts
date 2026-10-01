import type { Container } from '$lib/container';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { TextQuote } from '$lib/shared/anchor';
import { captureId } from '$lib/shared/ids';
import type { Notify } from '$lib/shared/notice';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { CaptureDraft } from '../../domain/capture/capture';
import { recognizedText } from '../../domain/engine/recognized-text';
import { describeStorageFailure, thrownFailure } from './storage-failure';
import type { StorageFailure } from './storage-failure';
import { CaptureList } from './capture-list.svelte';
import { CaptureEdits } from './capture-edits.svelte';
import { CaptureRemoval } from './capture-removal.svelte';
import { CaptureTags } from './capture-tags.svelte';
import { ClearAll } from './clear-all.svelte';
import type { Settled } from './panel-capture';

type NoteEditors = {
  readonly open: (capture: CaptureId) => void;
  readonly close: (capture: CaptureId) => void;
};

class CaptureCollection {
  readonly list: CaptureList;
  readonly clearAll: ClearAll;
  readonly removal: CaptureRemoval;
  readonly edits: CaptureEdits;
  readonly tagging: CaptureTags;

  #container: Container;
  #notify: Notify;
  #editors: NoteEditors;

  constructor(container: Container, notify: Notify, editors: NoteEditors) {
    this.#container = container;
    this.#notify = notify;
    this.#editors = editors;
    this.list = new CaptureList(container, (tags) => this.tagging.adopt(tags));
    this.clearAll = new ClearAll(container, notify, this.list);
    this.removal = new CaptureRemoval(container, notify, this.list);
    this.edits = new CaptureEdits(container, notify, this.list);
    this.tagging = new CaptureTags(container, notify, this.list);
  }

  note(regions: readonly ImageRegion[]): void {
    const book = this.list.book;
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
    const book = this.list.book;
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
    const generation = this.list.generation;
    const id = captureId(crypto.randomUUID());
    const anchor = textAnchor(cfi, quote, chapter);
    const text = recognizedText(quote.exact, null);
    this.list.put({
      id,
      anchor,
      origin: 'lifted',
      note: null,
      tagIds: [],
      status: 'done',
      text,
      edited: false,
    });

    await this.#keep(generation, {
      id,
      bookId: book,
      anchor,
      text: text.text,
      origin: 'lifted',
    });
  }

  async write(book: BookId, regions: readonly ImageRegion[]): Promise<void> {
    const generation = this.list.generation;
    const id = captureId(crypto.randomUUID());
    const anchor = regionAnchor(regions);
    this.list.put({
      id,
      anchor,
      origin: 'written',
      tagIds: [],
      status: 'done',
      text: recognizedText('', null),
      edited: false,
    });
    this.#editors.open(id);

    const written = await this.#container.recognition
      .writeNote(id, book, anchor)
      .catch(thrownFailure);
    if (generation !== this.list.generation) return;
    if (!written.ok) {
      this.#editors.close(id);
      this.#unsaved(id, 'The note could not be saved', written.error);
      return;
    }

    this.list.keep(written.value);
  }

  async recognizing(
    regions: readonly ImageRegion[],
    reading: () => Promise<Settled>,
  ): Promise<void> {
    const book = this.list.book;
    const generation = this.list.generation;
    const id = captureId(crypto.randomUUID());
    const anchor = regionAnchor(regions);
    this.list.put({
      id,
      anchor,
      origin: 'recognized',
      note: null,
      tagIds: [],
      status: 'pending',
    });

    const settled = await reading();

    this.list.settle(id, settled);
    if (book === null || settled.status !== 'done') return;

    await this.#keep(generation, {
      id,
      bookId: book,
      anchor,
      text: settled.text.text,
      confidence: settled.text.confidence,
      origin: 'recognized',
    });
  }

  async #keep(generation: number, draft: CaptureDraft): Promise<void> {
    const kept = await this.#container.recognition.saveCapture(draft).catch(thrownFailure);
    if (generation !== this.list.generation) return;
    if (!kept.ok) {
      this.#unsaved(draft.id, 'The capture could not be saved', kept.error);
      return;
    }

    this.list.keep(kept.value);
  }

  #unsaved(id: CaptureId, title: string, failure: StorageFailure): void {
    const reason = describeStorageFailure(failure);
    this.list.settle(id, { status: 'failed', message: `Not saved. ${reason}` });
    this.#notify({ tone: 'danger', title, message: reason });
  }
}

export { CaptureCollection };
