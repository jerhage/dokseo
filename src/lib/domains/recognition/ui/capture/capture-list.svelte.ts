import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import type { Anchor } from '$lib/shared/anchor';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ArrivalCapture } from '../../domain/capture/capture-arrival';
import { oldestFirst } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import type { Tag } from '../../domain/tag/tag';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import { READ, READING, readFailed } from './capture-read';
import type { CaptureRead } from './capture-read';
import { cardOf, takenOf } from './panel-capture';
import type { PanelCapture, Settled, Taken } from './panel-capture';
import { describeStorageFailure, thrownFailure } from './storage-failure';

type Removed = {
  readonly card: PanelCapture;
  readonly stored: Capture | undefined;
  readonly at: number;
};

type Emptied = {
  readonly captures: readonly PanelCapture[];
  readonly stored: ReadonlyMap<CaptureId, Capture>;
};

class CaptureList {
  #container: Container;
  #adoptTags: (tags: readonly Tag[]) => void;
  #captures = $state.raw<readonly PanelCapture[]>([]);
  #state = $state.raw<CaptureRead>(READING);
  #latest = $state.raw<CaptureId | null>(null);
  #book = $state.raw<BookId | null>(null);
  #generation = 0;
  #stored = new Map<CaptureId, Capture>();

  constructor(container: Container, adoptTags: (tags: readonly Tag[]) => void) {
    this.#container = container;
    this.#adoptTags = adoptTags;
  }

  get captures(): readonly PanelCapture[] {
    return this.#captures;
  }

  get state(): CaptureRead {
    return this.#state;
  }

  get latest(): CaptureId | null {
    return this.#latest;
  }

  get book(): BookId | null {
    return this.#book;
  }

  get generation(): number {
    return this.#generation;
  }

  get count(): number {
    return this.#captures.length;
  }

  get anchors(): readonly Anchor[] {
    return this.#captures.map((capture) => capture.anchor);
  }

  get newestFirst(): readonly PanelCapture[] {
    return this.#captures.toReversed();
  }

  get read(): readonly ArrivalCapture[] {
    return this.#captures
      .filter((capture) => capture.status === 'done')
      .map((capture) => this.#marked(capture));
  }

  stored(id: CaptureId): Capture | undefined {
    return this.#stored.get(id);
  }

  async open(book: BookId): Promise<void> {
    const generation = this.forget();
    this.#book = book;

    await this.#load(book, generation);
  }

  async reload(): Promise<void> {
    const book = this.#book;
    if (book === null) return;

    this.#state = READING;
    await this.#load(book, this.#generation);
  }

  forget(): number {
    this.#book = null;
    this.#state = READING;
    this.#captures = [];
    this.#latest = null;
    this.#stored = new Map();
    this.#generation += 1;
    return this.#generation;
  }

  put(card: PanelCapture): void {
    this.#captures = [...this.#captures, card];
    this.#latest = card.id;
  }

  keep(capture: Capture): void {
    this.#stored.set(capture.id, capture);
  }

  settle(id: CaptureId, settled: Settled): void {
    this.change(id, (capture) => ({ ...takenOf(capture), ...settled }));
  }

  change(id: CaptureId, changed: (capture: PanelCapture) => PanelCapture): void {
    this.#captures = this.#captures.map((capture) =>
      capture.id === id ? changed(capture) : capture,
    );
  }

  take(id: CaptureId): Removed | null {
    const at = this.#captures.findIndex((capture) => capture.id === id);
    const card = this.#captures[at];
    if (card === undefined) return null;

    const stored = this.#stored.get(id);
    this.#stored.delete(id);
    this.#captures = this.#captures.toSpliced(at, 1);
    return { card, stored, at };
  }

  putBack(removed: Removed): void {
    const id = removed.card.id;
    if (this.#captures.some((capture) => capture.id === id)) return;

    if (removed.stored !== undefined) this.#stored.set(id, removed.stored);
    this.#captures = this.#captures.toSpliced(removed.at, 0, removed.card);
  }

  empty(): Emptied {
    const emptied = { captures: this.#captures, stored: this.#stored };
    this.#generation += 1;
    this.#captures = [];
    this.#stored = new Map();
    return emptied;
  }

  restore(emptied: Emptied): void {
    this.#captures = [...emptied.captures, ...this.#captures];
    this.#stored = new Map([...emptied.stored, ...this.#stored]);
  }

  async #load(book: BookId, generation: number): Promise<void> {
    const [listed, named] = await Promise.all([
      this.#container.recognition.listCaptures(book).catch(thrownFailure),
      this.#container.recognition.listTags().catch(thrownFailure),
    ]);

    if (generation !== this.#generation) return;
    if (named.ok) this.#adoptTags(named.value);
    if (listed.ok) this.#hold(oldestFirst(listed.value));

    const failed = listed.ok ? (named.ok ? null : named.error) : listed.error;
    this.#state = failed === null ? READ : readFailed(describeStorageFailure(failed));
  }

  #hold(held: readonly Capture[]): void {
    const stored = new Set(held.map((capture) => capture.id));
    this.#stored = new Map([
      ...this.#stored,
      ...held.map((capture) => [capture.id, capture] as const),
    ]);
    this.#captures = [
      ...held.map(cardOf),
      ...this.#captures.filter((capture) => !stored.has(capture.id)),
    ];
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
    const stored = this.#stored.get(id);
    return stored?.origin === origin ? stored.note : null;
  }
}

export { CaptureList };
export type { Emptied, Removed };
