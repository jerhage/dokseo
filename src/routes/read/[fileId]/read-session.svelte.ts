import type { QueryClient } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { refreshLibrary } from '$lib/domains/library/ui/library-refresh';
import { editInLanguage } from '$lib/domains/library/ui/reading-defaults.svelte';
import { CaptureView } from '$lib/domains/recognition/ui/capture/capture-view.svelte';
import {
  arrivalFrom,
  passageArrivalFrom,
  passageFrom,
} from '$lib/domains/recognition/ui/capture/capture-arrivals';
import {
  anchorsOf,
  listingOf,
  panelCapturesOf,
  readOf,
} from '$lib/domains/recognition/ui/capture/capture-list-rules';
import type { CaptureListing } from '$lib/domains/recognition/ui/capture/capture-read';
import { arrivalGlow, everyOtherGlow } from '$lib/domains/recognition/ui/capture/capture-glow';
import type { EngineGateRead } from '$lib/domains/recognition/ui/engine/engine-gate';
import { comparePassages } from '$lib/domains/flowing/ui/flow-passage-order';
import { FlowView } from '$lib/domains/flowing/ui/flow-view.svelte';
import { ReaderView } from '$lib/domains/viewing/ui/reader-view.svelte';
import { parsedBookId } from '$lib/shared/ids';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { GlowRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import {
  IMAGE_ARRIVAL_SHOWING,
  IMAGE_PARAMETER,
  LIBRARY_AFTER_MISSING_BOOK,
  arrivalQuery,
  imageArrivalShows,
  mirroredPlace,
  readArrival,
  readImageIndex,
  readerNavigation,
} from '$lib/shared/reader-location';
import type { ImageArrivalStanding, ReaderRequest, ShownPlace } from '$lib/shared/reader-location';

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
  #standing = $state<ImageArrivalStanding>(IMAGE_ARRIVAL_SHOWING);
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
  #here = $derived.by(() =>
    arrivalFrom(this.#read, this.#found, this.reader.direction, comparePassages),
  );
  #glow = $derived(arrivalGlow(this.#here));
  #everyGlow = $derived.by(() => everyOtherGlow(this.#read, this.#here));
  #passage = $derived.by(() => passageFrom(this.#anchors, this.#found));
  #stepping = $derived(this.#here?.stepping ?? null);
  #passageHere = $derived.by(() => passageArrivalFrom(this.#read, this.#found, comparePassages));
  #passageStepping = $derived(this.#passageHere?.stepping ?? null);
  #finding = $derived(arrivalQuery(this.#found));
  #arrivalShows = $derived(imageArrivalShows(this.#standing));

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
    return this.#glow;
  }

  get everyGlow(): readonly GlowRegion[] {
    return this.#everyGlow;
  }

  get stepping() {
    return this.#stepping;
  }

  get passageStepping() {
    return this.#passageStepping;
  }

  get finding(): string | null {
    return this.#finding;
  }

  get arrivalShows(): boolean {
    return this.#arrivalShows;
  }

  mirror(place: ShownPlace): void {
    const mirrored = mirroredPlace(this.#address.shown(), place, this.#standing);
    this.#standing = mirrored.standing;
    if (mirrored.url !== null) this.#address.replace(mirrored.url);
  }

  arrive(book: BookId): void {
    const wanted = this.#passage;
    if (wanted !== null) this.flow.arrivals.arriveAt(book, wanted);
  }

  capturesRead(book: BookId): void {
    if (this.#arriving !== book) return;
    this.#arriving = null;
    this.arrive(book);
  }

  navigate(): void {
    this.#standing = IMAGE_ARRIVAL_SHOWING;
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
      .with(
        { kind: 'go-to-image' },
        ({ book, image }) => void this.reader.navigation.goToImage(book, image),
      )
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
