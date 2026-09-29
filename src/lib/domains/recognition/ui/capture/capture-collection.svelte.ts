import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor, SoughtPassage, TextQuote } from '$lib/shared/anchor';
import { captureId, tagId } from '$lib/shared/ids';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notify } from '$lib/shared/notice';
import { err } from '$lib/shared/result';
import { clearScope } from './clearing';
import type { ClearScope } from './clearing';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { Result } from '$lib/shared/result';
import type { ReaderArrival } from '$lib/shared/reader-location';
import { arrivalAt, passageArrivalAt, soughtPassage } from '../../domain/capture/capture-arrival';
import type { Arrival, ArrivalCapture } from '../../domain/capture/capture-arrival';
import type { PassageOrder } from '../../domain/capture/capture-order';
import { editedText, oldestFirst } from '../../domain/capture/capture';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import { tagCounts } from '../../domain/tag/capture-tags';
import type { Tag } from '../../domain/tag/tag';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { CreateTagError } from '../../use-cases/tag/create-tag';
import { NOT_STORED, describeStorageFailure, thrownFailure } from './storage-failure';
import type { StorageFailure } from './storage-failure';

type CaptureStatus = 'pending' | 'done' | 'empty' | 'failed';

type Recorded = {
  readonly id: CaptureId;
  readonly anchor: Anchor;
  readonly tagIds: readonly TagId[];
};

type Taken =
  | (Recorded & { readonly origin: 'recognized'; readonly note: string | null })
  | (Recorded & { readonly origin: 'lifted'; readonly note: string | null })
  | (Recorded & { readonly origin: 'written' });

type Settled =
  | { readonly status: 'done'; readonly text: RecognizedText; readonly edited: boolean }
  | { readonly status: 'empty' }
  | { readonly status: 'failed'; readonly message: string };

type PanelCapture = (Taken & { readonly status: 'pending' }) | (Taken & Settled);

type CaptureLoad =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded' }
  | { readonly status: 'failed'; readonly message: string };

type WriteOutcome = 'saved' | 'failed';

type NoteEditors = {
  readonly open: (capture: CaptureId) => void;
  readonly close: (capture: CaptureId) => void;
};

type Removed = {
  readonly card: PanelCapture;
  readonly stored: Capture | undefined;
  readonly at: number;
};

type TagOutcome =
  | { readonly kind: 'created'; readonly tag: Tag }
  | { readonly kind: 'existing'; readonly tag: Tag }
  | { readonly kind: 'failed'; readonly failure: StorageFailure };

const CAPTURE_REMOVED = 'Capture removed';

const RESTORE_FAILED = 'The capture could not be restored';

const LOADING: CaptureLoad = { status: 'loading' };

const LOADED: CaptureLoad = { status: 'loaded' };

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

function cardOf(capture: Capture): PanelCapture {
  const held = {
    id: capture.id,
    anchor: capture.anchor,
    tagIds: capture.tagIds,
    status: 'done' as const,
    edited: capture.editedAt !== null,
  };

  return match(capture)
    .with({ origin: 'written' }, (note) => ({
      ...held,
      origin: 'written' as const,
      text: recognizedText(note.text, null),
    }))
    .with({ origin: 'lifted' }, (lifted) => ({
      ...held,
      origin: 'lifted' as const,
      note: lifted.note,
      text: recognizedText(lifted.text, null),
    }))
    .with({ origin: 'recognized' }, (read) => ({
      ...held,
      origin: 'recognized' as const,
      note: read.note,
      text: recognizedText(read.text, read.confidence),
    }))
    .exhaustive();
}

function takenOf(capture: PanelCapture): Taken {
  const held = { id: capture.id, anchor: capture.anchor, tagIds: capture.tagIds };

  return match(capture)
    .with({ origin: 'written' }, () => ({ ...held, origin: 'written' as const }))
    .with({ origin: 'lifted' }, (lifted) => ({
      ...held,
      origin: 'lifted' as const,
      note: lifted.note,
    }))
    .with({ origin: 'recognized' }, (read) => ({
      ...held,
      origin: 'recognized' as const,
      note: read.note,
    }))
    .exhaustive();
}

class CaptureCollection {
  captures = $state.raw<readonly PanelCapture[]>([]);
  confirmingClear = $state(false);
  tags = $state.raw<readonly Tag[]>([]);
  libraryCounts = $state.raw<ReadonlyMap<TagId, number>>(new Map());
  load = $state.raw<CaptureLoad>(LOADING);

  #container: Container;
  #notify: Notify;
  #editors: NoteEditors;
  #book = $state.raw<BookId | null>(null);
  #generation = 0;
  #capturesById = new Map<CaptureId, Capture>();

  constructor(container: Container, notify: Notify, editors: NoteEditors) {
    this.#container = container;
    this.#notify = notify;
    this.#editors = editors;
  }

  get generation(): number {
    return this.#generation;
  }

  get clearing(): ClearScope {
    return clearScope(this.captures);
  }

  get count(): number {
    return this.captures.length;
  }

  get book(): BookId | null {
    return this.#book;
  }

  get bookCounts(): ReadonlyMap<TagId, number> {
    return tagCounts(this.captures);
  }

  get anchors(): readonly Anchor[] {
    return this.captures.map((capture) => capture.anchor);
  }

  get newestFirst(): readonly PanelCapture[] {
    return this.captures.toReversed();
  }

  get read(): readonly ArrivalCapture[] {
    return this.captures
      .filter((capture) => capture.status === 'done')
      .map((capture) => this.#marked(capture));
  }

  #marked(card: Taken & { readonly text: RecognizedText }): ArrivalCapture {
    const held = { id: card.id, anchor: card.anchor, text: card.text.text };

    return match(card)
      .with({ origin: 'written' }, () => ({ ...held, origin: 'written' as const }))
      .with({ origin: 'lifted' }, () => ({
        ...held,
        origin: 'lifted' as const,
        note: this.#noteKept(card.id, 'lifted'),
      }))
      .with({ origin: 'recognized' }, () => ({
        ...held,
        origin: 'recognized' as const,
        note: this.#noteKept(card.id, 'recognized'),
      }))
      .exhaustive();
  }

  #noteKept(id: CaptureId, origin: 'recognized' | 'lifted'): string | null {
    const stored = this.#capturesById.get(id);
    return stored?.origin === origin ? stored.note : null;
  }

  arrivalFrom(found: ReaderArrival, direction: ReadingDirection): Arrival<ArrivalCapture> | null {
    return match(found)
      .with({ kind: 'image' }, (image) =>
        image.region === null
          ? null
          : arrivalAt(this.read, image.query, direction, {
              index: image.index,
              rect: image.region,
            }),
      )
      .with({ kind: 'passage' }, () => null)
      .with({ kind: 'none' }, () => null)
      .exhaustive();
  }

  passageArrivalFrom(found: ReaderArrival, order: PassageOrder): Arrival<ArrivalCapture> | null {
    return match(found)
      .with({ kind: 'passage' }, (passage) =>
        passageArrivalAt(this.read, passage.query, passage.cfi, order),
      )
      .with({ kind: 'image' }, () => null)
      .with({ kind: 'none' }, () => null)
      .exhaustive();
  }

  passageFrom(found: ReaderArrival): SoughtPassage | null {
    return match(found)
      .with({ kind: 'passage' }, (passage) => soughtPassage(this.anchors, passage.cfi))
      .with({ kind: 'image' }, () => null)
      .with({ kind: 'none' }, () => null)
      .exhaustive();
  }

  async open(book: BookId): Promise<void> {
    const generation = this.forget();
    this.#book = book;

    await this.#load(book, generation);
  }

  async reload(): Promise<void> {
    const book = this.#book;
    if (book === null) return;

    this.load = LOADING;
    await this.#load(book, this.#generation);
  }

  async #load(book: BookId, generation: number): Promise<void> {
    const [listed, named] = await Promise.all([
      this.#container.recognition.listCaptures(book).catch(thrownFailure),
      this.#container.recognition.listTags().catch(thrownFailure),
    ]);

    if (generation !== this.#generation) return;
    if (named.ok) this.tags = named.value;
    if (listed.ok) this.#hold(oldestFirst(listed.value));

    const failed = listed.ok ? (named.ok ? null : named.error) : listed.error;
    this.load =
      failed === null ? LOADED : { status: 'failed', message: describeStorageFailure(failed) };
  }

  #hold(held: readonly Capture[]): void {
    const stored = new Set(held.map((capture) => capture.id));
    this.#capturesById = new Map([
      ...this.#capturesById,
      ...held.map((capture) => [capture.id, capture] as const),
    ]);
    this.captures = [
      ...held.map(cardOf),
      ...this.captures.filter((capture) => !stored.has(capture.id)),
    ];
  }

  forget(): number {
    this.#book = null;
    this.load = LOADING;
    this.captures = [];
    this.#capturesById = new Map();
    this.#generation += 1;
    return this.#generation;
  }

  note(regions: readonly ImageRegion[]): void {
    const book = this.#book;
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
    const book = this.#book;
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
    const generation = this.#generation;
    const id = captureId(crypto.randomUUID());
    const anchor = textAnchor(cfi, quote, chapter);
    const text = recognizedText(quote.exact, null);
    this.captures = [
      ...this.captures,
      {
        id,
        anchor,
        origin: 'lifted',
        note: null,
        tagIds: [],
        status: 'done',
        text,
        edited: false,
      },
    ];

    await this.#keep(generation, {
      id,
      bookId: book,
      anchor,
      text: text.text,
      origin: 'lifted',
    });
  }

  async write(book: BookId, regions: readonly ImageRegion[]): Promise<void> {
    const generation = this.#generation;
    const id = captureId(crypto.randomUUID());
    const anchor = regionAnchor(regions);
    this.captures = [
      ...this.captures,
      {
        id,
        anchor,
        origin: 'written',
        tagIds: [],
        status: 'done',
        text: recognizedText('', null),
        edited: false,
      },
    ];
    this.#editors.open(id);

    const written = await this.#container.recognition
      .writeNote(id, book, anchor)
      .catch(thrownFailure);
    if (generation !== this.#generation) return;
    if (!written.ok) {
      this.#editors.close(id);
      this.#unsaved(id, 'The note could not be saved', written.error);
      return;
    }

    this.#capturesById.set(written.value.id, written.value);
  }

  async recognizing(
    regions: readonly ImageRegion[],
    reading: () => Promise<Settled>,
  ): Promise<void> {
    const book = this.#book;
    const generation = this.#generation;
    const id = captureId(crypto.randomUUID());
    const anchor = regionAnchor(regions);
    this.captures = [
      ...this.captures,
      {
        id,
        anchor,
        origin: 'recognized',
        note: null,
        tagIds: [],
        status: 'pending',
      },
    ];

    const settled = await reading();

    this.#settle(id, settled);
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
    const card = this.captures.find((capture) => capture.id === id);
    if (card === undefined || card.status !== 'done') return 'saved';

    const settled = editedText(card.text.text, text, card.origin);
    if (settled === card.text.text) return 'saved';

    const generation = this.#generation;
    const stored = this.#capturesById.get(id);
    const written =
      stored === undefined
        ? err(NOT_STORED)
        : await this.#container.recognition.editCaptureText(stored, settled).catch(thrownFailure);

    if (generation !== this.#generation) return 'saved';
    if (!written.ok) return this.#refuse('The text could not be saved', written.error);

    this.#capturesById.set(id, written.value);
    this.captures = this.captures.map((capture) =>
      capture.id === id && capture.status === 'done'
        ? { ...capture, text: recognizedText(settled, capture.text.confidence), edited: true }
        : capture,
    );
    return 'saved';
  }

  async annotate(id: CaptureId, note: string): Promise<WriteOutcome> {
    const stored = this.#capturesById.get(id);
    if (stored?.origin === 'written') return 'saved';
    if (!this.captures.some((capture) => capture.id === id)) return 'saved';

    const generation = this.#generation;
    const written =
      stored === undefined
        ? err(NOT_STORED)
        : await this.#container.recognition.writeCaptureNote(stored, note).catch(thrownFailure);

    if (generation !== this.#generation) return 'saved';
    if (!written.ok) return this.#refuse('The note could not be saved', written.error);

    this.#capturesById.set(id, written.value);
    const kept = written.value.note;
    this.captures = this.captures.map((capture) =>
      capture.id === id && capture.origin !== 'written' ? { ...capture, note: kept } : capture,
    );
    return 'saved';
  }

  async remove(id: CaptureId): Promise<WriteOutcome> {
    const removed = this.#take(id);
    if (removed === null || removed.stored === undefined) return 'saved';

    const stored = removed.stored;
    const generation = this.#generation;
    const gone = await this.#container.recognition.removeCapture(id).catch(thrownFailure);
    if (generation !== this.#generation) return 'saved';
    if (gone.ok) {
      this.#notify({
        tone: 'success',
        title: CAPTURE_REMOVED,
        action: { label: 'Undo', run: () => void this.#undoRemove(removed, stored, generation) },
        duration: ACTION_NOTICE_MS,
      });
      return 'saved';
    }

    this.#putBack(removed);
    return this.#refuse('The capture could not be removed', gone.error);
  }

  async #undoRemove(removed: Removed, stored: Capture, generation: number): Promise<void> {
    const restored = await this.#container.recognition.restoreCapture(stored).catch(thrownFailure);
    if (!restored.ok) {
      this.#refuse(RESTORE_FAILED, restored.error);
      return;
    }
    if (generation !== this.#generation) return;

    this.#putBack(removed);
  }

  #take(id: CaptureId): Removed | null {
    const at = this.captures.findIndex((capture) => capture.id === id);
    const card = this.captures[at];
    if (card === undefined) return null;

    const stored = this.#capturesById.get(id);
    this.#capturesById.delete(id);
    this.captures = this.captures.toSpliced(at, 1);
    return { card, stored, at };
  }

  #putBack(removed: Removed): void {
    const id = removed.card.id;
    if (this.captures.some((capture) => capture.id === id)) return;

    if (removed.stored !== undefined) this.#capturesById.set(id, removed.stored);
    this.captures = this.captures.toSpliced(removed.at, 0, removed.card);
  }

  async loadTags(): Promise<void> {
    const generation = this.#generation;
    const named = await this.#container.recognition.listTags().catch(() => null);

    if (generation !== this.#generation || named === null || !named.ok) return;

    this.tags = named.value;
  }

  async loadTagCounts(): Promise<void> {
    const generation = this.#generation;
    const everywhere = await this.#container.recognition.listEveryCapture().catch(() => null);

    if (generation !== this.#generation || everywhere === null || !everywhere.ok) return;

    this.libraryCounts = tagCounts(everywhere.value);
  }

  async addTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.#capturesById.get(id);
    if (stored === undefined) {
      this.#refuse('The tag could not be added', NOT_STORED);
      return;
    }

    const generation = this.#generation;
    const written = await this.#container.recognition
      .addTagToCapture(stored, tag)
      .catch(thrownFailure);

    if (generation !== this.#generation) return;
    if (!written.ok) {
      this.#refuse('The tag could not be added', written.error);
      return;
    }

    this.#capturesById.set(id, written.value);
    this.#retag(id, stored.tagIds, written.value.tagIds);
  }

  async removeTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.#capturesById.get(id);
    if (stored === undefined) {
      this.#refuse('The tag could not be removed', NOT_STORED);
      return;
    }

    const generation = this.#generation;
    const written = await this.#container.recognition
      .removeTagFromCapture(stored, tag)
      .catch(thrownFailure);

    if (generation !== this.#generation) return;
    if (!written.ok) {
      this.#refuse('The tag could not be removed', written.error);
      return;
    }

    this.#capturesById.set(id, written.value);
    this.#retag(id, stored.tagIds, written.value.tagIds);
  }

  async createTag(id: CaptureId, name: string): Promise<void> {
    if (!this.#capturesById.has(id)) {
      this.#refuse('The tag could not be added', NOT_STORED);
      return;
    }

    const generation = this.#generation;
    const created = await this.#container.recognition
      .createTag(tagId(crypto.randomUUID()), name)
      .catch(thrownFailure);

    if (generation !== this.#generation) return;

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
    this.captures = this.captures.map((capture) =>
      capture.id === id ? { ...capture, tagIds: after } : capture,
    );
  }

  askClear(): void {
    if (this.captures.length === 0) return;
    this.confirmingClear = true;
  }

  dismissClear(): void {
    this.confirmingClear = false;
  }

  async clear(): Promise<void> {
    const book = this.#book;
    const held = { captures: this.captures, stored: this.#capturesById };
    this.confirmingClear = false;
    this.#generation += 1;
    const generation = this.#generation;
    this.captures = [];
    this.#capturesById = new Map();
    if (book === null) return;

    const cleared = await this.#container.recognition.clearCaptures(book).catch(thrownFailure);
    if (cleared.ok || generation !== this.#generation) return;

    this.captures = [...held.captures, ...this.captures];
    this.#capturesById = new Map([...held.stored, ...this.#capturesById]);
    this.#refuse('Your captures could not be deleted', cleared.error);
  }

  async #keep(generation: number, draft: CaptureDraft): Promise<void> {
    const kept = await this.#container.recognition.saveCapture(draft).catch(thrownFailure);
    if (generation !== this.#generation) return;
    if (!kept.ok) {
      this.#unsaved(draft.id, 'The capture could not be saved', kept.error);
      return;
    }

    this.#capturesById.set(kept.value.id, kept.value);
  }

  #unsaved(id: CaptureId, title: string, failure: StorageFailure): void {
    const reason = describeStorageFailure(failure);
    this.#settle(id, { status: 'failed', message: `Not saved. ${reason}` });
    this.#notify({ tone: 'danger', title, message: reason });
  }

  #refuse(title: string, failure: StorageFailure): 'failed' {
    this.#notify({ tone: 'danger', title, message: describeStorageFailure(failure) });
    return 'failed';
  }

  #settle(id: CaptureId, settled: Settled): void {
    this.captures = this.captures.map((capture) =>
      capture.id === id ? { ...takenOf(capture), ...settled } : capture,
    );
  }
}

export { CAPTURE_REMOVED, CaptureCollection, RESTORE_FAILED };
export type { CaptureLoad, CaptureStatus, PanelCapture, Settled, WriteOutcome };
