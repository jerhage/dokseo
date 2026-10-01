import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { SoughtPassage, TextQuote } from '$lib/shared/anchor';
import { captureId, tagId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
import { err } from '$lib/shared/result';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { Result } from '$lib/shared/result';
import type { ReaderArrival } from '$lib/shared/reader-location';
import { arrivalAt, passageArrivalAt, soughtPassage } from '../../domain/capture/capture-arrival';
import type { Arrival, ArrivalCapture } from '../../domain/capture/capture-arrival';
import type { PassageOrder } from '../../domain/capture/capture-order';
import { editedText } from '../../domain/capture/capture';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import { tagCounts } from '../../domain/tag/capture-tags';
import type { Tag } from '../../domain/tag/tag';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { CreateTagError } from '../../use-cases/tag/create-tag';
import { NOT_STORED, describeStorageFailure, refuse, thrownFailure } from './storage-failure';
import type { StorageFailure } from './storage-failure';
import { CaptureList } from './capture-list.svelte';
import { ClearAll } from './clear-all.svelte';
import type { Removed } from './capture-list.svelte';
import type { Settled } from './panel-capture';

type WriteOutcome = 'saved' | 'failed';

type NoteEditors = {
  readonly open: (capture: CaptureId) => void;
  readonly close: (capture: CaptureId) => void;
};

type TagOutcome =
  | { readonly kind: 'created'; readonly tag: Tag }
  | { readonly kind: 'existing'; readonly tag: Tag }
  | { readonly kind: 'failed'; readonly failure: StorageFailure };

const CAPTURE_REMOVED = 'Capture removed';

const RESTORE_FAILED = 'The capture could not be restored';

function tagOutcome(created: Result<Tag, CreateTagError | StorageFailure>): TagOutcome {
  if (created.ok) return { kind: 'created', tag: created.value };

  return match(created.error)
    .with({ kind: 'name-taken' }, (taken) => ({ kind: 'existing', tag: taken.tag }) as const)
    .with(
      { kind: 'storage-unavailable' },
      { kind: 'storage-failed' },
      { kind: 'not-stored' },
      (failure) => ({ kind: 'failed', failure }) as const,
    )
    .exhaustive();
}

function withTag(tags: readonly Tag[], tag: Tag): readonly Tag[] {
  return tags.some((held) => held.id === tag.id) ? tags : [...tags, tag];
}

function countsAfter(
  counts: ReadonlyMap<TagId, number>,
  before: readonly TagId[],
  after: readonly TagId[],
): ReadonlyMap<TagId, number> {
  const moved = new Map(counts);

  for (const tag of before) {
    if (!after.includes(tag)) moved.set(tag, Math.max((moved.get(tag) ?? 0) - 1, 0));
  }
  for (const tag of after) {
    if (!before.includes(tag)) moved.set(tag, (moved.get(tag) ?? 0) + 1);
  }

  return moved;
}

class CaptureCollection {
  readonly list: CaptureList;
  readonly clearAll: ClearAll;
  tags = $state.raw<readonly Tag[]>([]);
  libraryCounts = $state.raw<ReadonlyMap<TagId, number>>(new Map());

  #container: Container;
  #notify: Notify;
  #editors: NoteEditors;

  constructor(container: Container, notify: Notify, editors: NoteEditors) {
    this.#container = container;
    this.#notify = notify;
    this.#editors = editors;
    this.list = new CaptureList(container, (tags) => {
      this.tags = tags;
    });
    this.clearAll = new ClearAll(container, notify, this.list);
  }

  get bookCounts(): ReadonlyMap<TagId, number> {
    return tagCounts(this.list.captures);
  }

  arrivalFrom(
    found: ReaderArrival,
    direction: ReadingDirection,
    passages: PassageOrder,
  ): Arrival<ArrivalCapture> | null {
    return match(found)
      .with({ kind: 'image' }, (image) =>
        image.region === null
          ? null
          : arrivalAt(
              this.list.read,
              image.query,
              direction,
              { index: image.index, rect: image.region },
              passages,
            ),
      )
      .with({ kind: 'passage' }, () => null)
      .with({ kind: 'none' }, () => null)
      .exhaustive();
  }

  passageArrivalFrom(found: ReaderArrival, order: PassageOrder): Arrival<ArrivalCapture> | null {
    return match(found)
      .with({ kind: 'passage' }, (passage) =>
        passageArrivalAt(this.list.read, passage.query, passage.cfi, order),
      )
      .with({ kind: 'image' }, () => null)
      .with({ kind: 'none' }, () => null)
      .exhaustive();
  }

  passageFrom(found: ReaderArrival): SoughtPassage | null {
    return match(found)
      .with({ kind: 'passage' }, (passage) => soughtPassage(this.list.anchors, passage.cfi))
      .with({ kind: 'image' }, () => null)
      .with({ kind: 'none' }, () => null)
      .exhaustive();
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

  async edit(id: CaptureId, text: string): Promise<WriteOutcome> {
    const card = this.list.captures.find((capture) => capture.id === id);
    if (card === undefined || card.status !== 'done') return 'saved';

    const settled = editedText(card.text.text, text, card.origin);
    if (settled === card.text.text) return 'saved';

    const generation = this.list.generation;
    const stored = this.list.stored(id);
    const written =
      stored === undefined
        ? err(NOT_STORED)
        : await this.#container.recognition.editCaptureText(stored, settled).catch(thrownFailure);

    if (generation !== this.list.generation) return 'saved';
    if (!written.ok) return this.#refuse('The text could not be saved', written.error);

    this.list.keep(written.value);
    this.list.change(id, (capture) =>
      capture.status === 'done'
        ? { ...capture, text: recognizedText(settled, capture.text.confidence), edited: true }
        : capture,
    );
    return 'saved';
  }

  async annotate(id: CaptureId, note: string): Promise<WriteOutcome> {
    const stored = this.list.stored(id);
    if (stored?.origin === 'written') return 'saved';
    if (!this.list.captures.some((capture) => capture.id === id)) return 'saved';

    const generation = this.list.generation;
    const written =
      stored === undefined
        ? err(NOT_STORED)
        : await this.#container.recognition.writeCaptureNote(stored, note).catch(thrownFailure);

    if (generation !== this.list.generation) return 'saved';
    if (!written.ok) return this.#refuse('The note could not be saved', written.error);

    this.list.keep(written.value);
    const kept = written.value.note;
    this.list.change(id, (capture) =>
      capture.origin !== 'written' ? { ...capture, note: kept } : capture,
    );
    return 'saved';
  }

  async remove(id: CaptureId): Promise<WriteOutcome> {
    const removed = this.list.take(id);
    if (removed === null || removed.stored === undefined) return 'saved';

    const stored = removed.stored;
    const generation = this.list.generation;
    const gone = await this.#container.recognition.removeCapture(id).catch(thrownFailure);
    if (generation !== this.list.generation) return 'saved';
    if (gone.ok) {
      this.#notify({
        tone: 'success',
        title: CAPTURE_REMOVED,
        action: { label: 'Undo', run: () => void this.#undoRemove(removed, stored, generation) },
        duration: ACTION_NOTICE_MS,
      });
      return 'saved';
    }

    this.list.putBack(removed);
    return this.#refuse('The capture could not be removed', gone.error);
  }

  async #undoRemove(removed: Removed, stored: Capture, generation: number): Promise<void> {
    const restored = await this.#container.recognition.restoreCapture(stored).catch(thrownFailure);
    if (!restored.ok) {
      this.#refuse(RESTORE_FAILED, restored.error);
      return;
    }
    if (generation !== this.list.generation) return;

    this.list.putBack(removed);
  }

  async loadTags(): Promise<void> {
    const generation = this.list.generation;
    const named = await this.#container.recognition.listTags().catch(() => null);

    if (generation !== this.list.generation || named === null || !named.ok) return;

    this.tags = named.value;
  }

  async loadTagCounts(): Promise<void> {
    const generation = this.list.generation;
    const everywhere = await this.#container.recognition.listEveryCapture().catch(() => null);

    if (generation !== this.list.generation || everywhere === null || !everywhere.ok) return;

    this.libraryCounts = tagCounts(everywhere.value);
  }

  async addTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.list.stored(id);
    if (stored === undefined) {
      this.#refuse('The tag could not be added', NOT_STORED);
      return;
    }

    const generation = this.list.generation;
    const written = await this.#container.recognition
      .addTagToCapture(stored, tag)
      .catch(thrownFailure);

    if (generation !== this.list.generation) return;
    if (!written.ok) {
      this.#refuse('The tag could not be added', written.error);
      return;
    }

    this.list.keep(written.value);
    this.#retag(id, stored.tagIds, written.value.tagIds);
  }

  async removeTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.list.stored(id);
    if (stored === undefined) {
      this.#refuse('The tag could not be removed', NOT_STORED);
      return;
    }

    const generation = this.list.generation;
    const written = await this.#container.recognition
      .removeTagFromCapture(stored, tag)
      .catch(thrownFailure);

    if (generation !== this.list.generation) return;
    if (!written.ok) {
      this.#refuse('The tag could not be removed', written.error);
      return;
    }

    this.list.keep(written.value);
    this.#retag(id, stored.tagIds, written.value.tagIds);
  }

  async createTag(id: CaptureId, name: string): Promise<void> {
    if (this.list.stored(id) === undefined) {
      this.#refuse('The tag could not be added', NOT_STORED);
      return;
    }

    const generation = this.list.generation;
    const created = await this.#container.recognition
      .createTag(tagId(crypto.randomUUID()), name)
      .catch(thrownFailure);

    if (generation !== this.list.generation) return;

    const outcome = tagOutcome(created);
    if (outcome.kind === 'failed') {
      this.#refuse('The tag could not be created', outcome.failure);
      return;
    }

    const minted = outcome.tag;

    this.tags = withTag(this.tags, minted);
    await this.addTag(id, minted.id);
  }

  #retag(id: CaptureId, before: readonly TagId[], after: readonly TagId[]): void {
    this.libraryCounts = countsAfter(this.libraryCounts, before, after);
    this.list.change(id, (capture) => ({ ...capture, tagIds: after }));
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

  #refuse(title: string, failure: StorageFailure): 'failed' {
    return refuse(this.#notify, title, failure);
  }
}

export { CAPTURE_REMOVED, CaptureCollection, RESTORE_FAILED };
export type { WriteOutcome };
