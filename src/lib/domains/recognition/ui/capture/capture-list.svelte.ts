import type { Anchor } from '$lib/shared/anchor';
import type { BookId, CaptureId } from '$lib/shared/ids';
import type { ArrivalCapture } from '../../domain/capture/capture-arrival';
import type { Capture } from '../../domain/capture/capture';
import type { Tag } from '../../domain/tag/tag';
import { UNLISTED } from './capture-read';
import type { CaptureListing } from './capture-read';
import { listedCards, readCaptures } from './listed-cards';
import type { PanelCapture } from './panel-capture';
import { UnsavedCards } from './unsaved-cards.svelte';

class CaptureList {
  readonly unsaved = new UnsavedCards();

  #source: () => CaptureListing | undefined;
  #book = $state.raw<BookId | null>(null);
  #captures = $derived.by(() => listedCards(this.listing.captures, this.unsaved.cards));

  constructor(source: () => CaptureListing | undefined) {
    this.#source = source;
  }

  get listing(): CaptureListing {
    return this.#source() ?? UNLISTED;
  }

  get book(): BookId | null {
    return this.#book;
  }

  get captures(): readonly PanelCapture[] {
    return this.#captures;
  }

  get tags(): readonly Tag[] {
    return this.listing.tags;
  }

  get latest(): CaptureId | null {
    return this.unsaved.latest;
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
    return readCaptures(this.#captures, this.listing.captures);
  }

  stored(id: CaptureId): Capture | undefined {
    return this.listing.captures.find((capture) => capture.id === id);
  }

  open(book: BookId): void {
    this.#book = book;
    this.unsaved.forget();
  }

  forget(): void {
    this.#book = null;
    this.unsaved.forget();
  }
}

export { CaptureList };
