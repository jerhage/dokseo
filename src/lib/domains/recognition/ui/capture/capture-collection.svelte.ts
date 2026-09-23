import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor, TextQuote } from '$lib/shared/anchor';
import { captureId, tagId } from '$lib/shared/ids';
import { clearScope } from './clearing';
import type { ClearScope } from './clearing';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import type { Result } from '$lib/shared/result';
import type { ReaderArrival } from '$lib/shared/reader-location';
import { arrivalAt } from '../../domain/capture/capture-arrival';
import type { Arrival, ArrivalCapture } from '../../domain/capture/capture-arrival';
import { editedText, oldestFirst } from '../../domain/capture/capture';
import type { Capture, CaptureDraft } from '../../domain/capture/capture';
import { tagCounts } from '../../domain/tag/capture-tags';
import type { Tag } from '../../domain/tag/tag';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { CreateTagError } from '../../use-cases/tag/create-tag';

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

type TagOutcome =
  | { readonly kind: 'created'; readonly tag: Tag }
  | { readonly kind: 'existing'; readonly tag: Tag }
  | { readonly kind: 'unavailable' };

const UNAVAILABLE = { kind: 'unavailable' } as const;

function tagOutcome(created: Result<Tag, CreateTagError> | null): TagOutcome {
  if (created === null) return UNAVAILABLE;
  if (created.ok) return { kind: 'created', tag: created.value };

  return match(created.error)
    .with({ kind: 'name-taken' }, (taken) => ({ kind: 'existing', tag: taken.tag }) as const)
    .with({ kind: 'storage-unavailable' }, { kind: 'storage-failed' }, () => UNAVAILABLE)
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
  writing = $state.raw<CaptureId | null>(null);
  confirmingClear = $state(false);
  tags = $state.raw<readonly Tag[]>([]);
  libraryCounts = $state.raw<ReadonlyMap<TagId, number>>(new Map());

  #container: Container;
  #book = $state.raw<BookId | null>(null);
  #generation = 0;
  #capturesById = new Map<CaptureId, Capture>();

  constructor(container: Container) {
    this.#container = container;
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

  arrivalFrom(
    found: ReaderArrival | null,
    direction: ReadingDirection,
  ): Arrival<ArrivalCapture> | null {
    if (found === null) return null;
    return arrivalAt(this.read, found.query, direction, found.capture);
  }

  async open(book: BookId): Promise<void> {
    const generation = this.forget();
    this.#book = book;

    const [listed, named] = await Promise.all([
      this.#container.recognition.listCaptures(book).catch(() => null),
      this.#container.recognition.listTags().catch(() => null),
    ]);

    if (generation !== this.#generation) return;
    if (named !== null && named.ok) this.tags = named.value;
    if (listed === null || !listed.ok) return;

    const held = oldestFirst(listed.value);
    this.#capturesById = new Map(held.map((capture) => [capture.id, capture]));
    this.captures = held.map(cardOf);
  }

  forget(): number {
    this.#book = null;
    this.captures = [];
    this.writing = null;
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

  lift(cfi: string, quote: TextQuote): void {
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
      void this.keepLifted(book, cfi, quote);
    } finally {
      trace.end();
    }
  }

  async keepLifted(book: BookId, cfi: string, quote: TextQuote): Promise<void> {
    const generation = this.#generation;
    const id = captureId(crypto.randomUUID());
    const anchor = textAnchor(cfi, quote);
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
    this.writing = id;

    const written = await this.#container.recognition.writeNote(id, book, anchor).catch(() => null);
    if (written === null || !written.ok || generation !== this.#generation) return;

    this.#capturesById.set(written.value.id, written.value);
  }

  takeWriting(): CaptureId | null {
    const fresh = this.writing;
    this.writing = null;
    return fresh;
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

  async edit(id: CaptureId, text: string): Promise<void> {
    const card = this.captures.find((capture) => capture.id === id);
    if (card === undefined || card.status !== 'done') return;

    const settled = editedText(card.text.text, text, card.origin);
    if (settled === card.text.text) return;

    const generation = this.#generation;
    const stored = this.#capturesById.get(id);
    const written =
      stored === undefined
        ? null
        : await this.#container.recognition.editCaptureText(stored, settled).catch(() => null);

    if (generation !== this.#generation) return;
    if (written !== null && written.ok) this.#capturesById.set(id, written.value);

    this.captures = this.captures.map((capture) =>
      capture.id === id && capture.status === 'done'
        ? { ...capture, text: recognizedText(settled, capture.text.confidence), edited: true }
        : capture,
    );
  }

  async annotate(id: CaptureId, note: string): Promise<void> {
    const stored = this.#capturesById.get(id);
    if (stored === undefined || stored.origin === 'written') return;

    const generation = this.#generation;
    const written = await this.#container.recognition
      .writeCaptureNote(stored, note)
      .catch(() => null);

    if (generation !== this.#generation || written === null || !written.ok) return;

    this.#capturesById.set(id, written.value);
    const kept = written.value.note;
    this.captures = this.captures.map((capture) =>
      capture.id === id && capture.origin !== 'written' ? { ...capture, note: kept } : capture,
    );
  }

  async remove(id: CaptureId): Promise<void> {
    const generation = this.#generation;
    if (this.#capturesById.has(id)) {
      await this.#container.recognition.removeCapture(id).catch(() => undefined);
    }

    if (generation !== this.#generation) return;

    this.#capturesById.delete(id);
    this.captures = this.captures.filter((capture) => capture.id !== id);
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
    if (stored === undefined) return;

    const generation = this.#generation;
    const written = await this.#container.recognition
      .addTagToCapture(stored, tag)
      .catch(() => null);

    if (generation !== this.#generation || written === null || !written.ok) return;

    this.#capturesById.set(id, written.value);
    this.#retag(id, stored.tagIds, written.value.tagIds);
  }

  async removeTag(id: CaptureId, tag: TagId): Promise<void> {
    const stored = this.#capturesById.get(id);
    if (stored === undefined) return;

    const generation = this.#generation;
    const written = await this.#container.recognition
      .removeTagFromCapture(stored, tag)
      .catch(() => null);

    if (generation !== this.#generation || written === null || !written.ok) return;

    this.#capturesById.set(id, written.value);
    this.#retag(id, stored.tagIds, written.value.tagIds);
  }

  async createTag(id: CaptureId, name: string): Promise<void> {
    if (!this.#capturesById.has(id)) return;

    const generation = this.#generation;
    const created = await this.#container.recognition
      .createTag(tagId(crypto.randomUUID()), name)
      .catch(() => null);

    if (generation !== this.#generation) return;

    const minted = match(tagOutcome(created))
      .with({ kind: 'created' }, (made) => made.tag)
      .with({ kind: 'existing' }, (found) => found.tag)
      .with({ kind: 'unavailable' }, () => null)
      .exhaustive();

    if (minted === null) return;

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
    this.confirmingClear = false;
    this.#generation += 1;
    this.captures = [];
    this.#capturesById = new Map();
    if (book === null) return;

    await this.#container.recognition.clearCaptures(book).catch(() => undefined);
  }

  async #keep(generation: number, draft: CaptureDraft): Promise<void> {
    const kept = await this.#container.recognition.saveCapture(draft).catch(() => null);
    if (kept === null || !kept.ok || generation !== this.#generation) return;

    this.#capturesById.set(kept.value.id, kept.value);
  }

  #settle(id: CaptureId, settled: Settled): void {
    this.captures = this.captures.map((capture) =>
      capture.id === id ? { ...takenOf(capture), ...settled } : capture,
    );
  }
}

export { CaptureCollection };
export type { CaptureStatus, PanelCapture, Settled };
