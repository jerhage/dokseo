import type { QueryClient } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { refreshLibrary } from '$lib/domains/library/ui/library-refresh';
import { editInLanguage } from '$lib/domains/library/ui/reading-defaults.svelte';
import { CaptureView } from '$lib/domains/recognition/ui/capture/capture-view.svelte';
import {
  anchorsOf,
  listingOf,
  panelCapturesOf,
  readOf,
} from '$lib/domains/recognition/ui/capture/capture-list-rules';
import type { CaptureListing } from '$lib/domains/recognition/ui/capture/capture-read';
import type { EngineGateRead } from '$lib/domains/recognition/ui/engine/engine-gate';
import { FlowView } from '$lib/domains/flowing/ui/flow-view.svelte';
import { ReaderView } from '$lib/domains/viewing/ui/reader-view.svelte';
import { parsedBookId } from '$lib/shared/ids';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { GlowRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import {
  IMAGE_PARAMETER,
  LIBRARY_AFTER_MISSING_BOOK,
  arrivalQuery,
  readArrival,
  readImageIndex,
  readerNavigation,
} from '$lib/shared/reader-location';
import type { ReaderRequest, ShownPlace } from '$lib/shared/reader-location';
import { createImageArrival } from './image-arrival.svelte';
import type { ImageArrivalHook } from './image-arrival.svelte';
import { imageArrivalOf, passageArrivalOf } from './read-arrival';

type ReadAddress = {
  readonly fileId: () => string | undefined;
  readonly requested: () => URL;
  readonly shown: () => URL;
  readonly replace: (url: URL) => void;
  readonly leave: (path: string) => void;
};

class ReadSession {
  readonly reader: ReaderView;
  readonly captures: CaptureView;
  readonly flow: FlowView;

  #client: QueryClient;
  #address: ReadAddress;
  #listing: () => CaptureListing | undefined;
  #imageArrival: ImageArrivalHook;
  #requested: ReaderRequest | null = null;
  #arriving: BookId | null = null;
  #id = $derived.by(() => parsedBookId(this.#address.fileId() ?? ''));
  #asked = $derived.by(() =>
    readImageIndex(this.#address.requested().searchParams.get(IMAGE_PARAMETER)),
  );
  #found = $derived.by(() => readArrival(this.#address.requested().searchParams));
  #cards = $derived.by(() => panelCapturesOf(this.listing, this.captures.recording.unsaved.cards));
  #read = $derived.by(() => readOf(this.#cards, this.listing));
  #anchors = $derived.by(() => anchorsOf(this.#cards));
  #image = $derived.by(() => imageArrivalOf(this.#read, this.#found, this.reader.direction));
  #passageArrival = $derived.by(() => passageArrivalOf(this.#read, this.#anchors, this.#found));
  #finding = $derived(arrivalQuery(this.#found));

  constructor(
    container: Container,
    client: QueryClient,
    notify: Notify,
    address: ReadAddress,
    listing: () => CaptureListing | undefined,
    engine: () => EngineGateRead | undefined,
  ) {
    this.#client = client;
    this.#address = address;
    this.#listing = listing;
    this.#imageArrival = createImageArrival(address.shown, address.replace);
    this.reader = new ReaderView(
      container,
      notify,
      (place) => this.mirror(place),
      (book, known) => this.#warm(book, known),
      () => this.#bookChanged(),
      editInLanguage,
    );
    this.captures = new CaptureView(container, notify, client, engine);
    this.flow = new FlowView(container, notify, client, () => this.#bookChanged());
  }

  get listing(): CaptureListing {
    return listingOf(this.#listing());
  }

  get count(): number {
    return this.#cards.length;
  }

  get anchors() {
    return this.#anchors;
  }

  get id(): BookId | null {
    return this.#id;
  }

  get language(): Language | null {
    return this.reader.language;
  }

  get glow(): readonly GlowRegion[] {
    return this.#image.glow;
  }

  get everyGlow(): readonly GlowRegion[] {
    return this.#image.everyGlow;
  }

  get stepping() {
    return this.#image.stepping;
  }

  get passageStepping() {
    return this.#passageArrival.stepping;
  }

  get finding(): string | null {
    return this.#finding;
  }

  get arrivalShows(): boolean {
    return this.#imageArrival.shows;
  }

  mirror(place: ShownPlace): void {
    this.#imageArrival.mirror(place);
  }

  arrive(book: BookId): void {
    const wanted = this.#passageArrival.passage;
    if (wanted !== null) this.flow.arrivals.arriveAt(book, wanted);
  }

  capturesRead(book: BookId): void {
    if (this.#arriving !== book) return;
    this.#arriving = null;
    this.arrive(book);
  }

  navigate(): void {
    this.#imageArrival.reset();
    const named = this.#id;
    if (named === null) {
      this.#address.leave(LIBRARY_AFTER_MISSING_BOOK);
      return;
    }
    const wanted = { book: named, image: this.#asked };
    const next = readerNavigation(this.#requested, wanted);
    this.#requested = wanted;
    match(next)
      .with({ kind: 'enter' }, ({ book, image }) => this.#open(book, image))
      .with({ kind: 'switch' }, ({ book, image }) => {
        this.close();
        this.#open(book, image);
      })
      .with({ kind: 'go-to-image' }, ({ book, image }) => void this.reader.goToImage(book, image))
      .with({ kind: 'stay' }, () => undefined)
      .exhaustive();
  }

  leaving(fileId: string | undefined): void {
    if (parsedBookId(fileId ?? '') === this.#id) return;

    this.flow.close();
  }

  close(): void {
    this.reader.dispose();
    this.captures.close();
  }

  #bookChanged(): void {
    void refreshLibrary(this.#client);
  }

  #warm(book: BookId, known: Language): void {
    void this.captures.warm(book, known);
  }

  #open(book: BookId, image: ImageIndex | null): void {
    void this.reader.open(book, image).then(() => this.#leaveIfMissing());
    this.#arriving = book;
    this.captures.open(book);
  }

  #leaveIfMissing(): void {
    if (this.reader.opening.kind === 'missing') this.#address.leave(LIBRARY_AFTER_MISSING_BOOK);
  }
}

export { ReadSession };
export type { ReadAddress };
