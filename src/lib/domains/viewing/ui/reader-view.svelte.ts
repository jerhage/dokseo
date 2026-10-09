import type { Container } from '$lib/container';
import { releasePicture } from '$lib/platform/image/bitmap';
import { describeCause } from '$lib/shared/cause';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import { effectiveDirection, imageLayoutKind } from '$lib/shared/layout-kind';
import type { ImageLayoutKind, ReadingDirection } from '$lib/shared/layout-kind';
import type { PagePicture, PageSource } from '$lib/shared/page-source';
import { openingPlace } from '$lib/shared/reader-location';
import type { ShownPlace } from '$lib/shared/reader-location';
import { PLACE_KEPT, PlaceKeeper } from '$lib/shared/place-keeper';
import type { PlaceSaved } from '$lib/shared/place-keeper';
import { imagePlace, readingStarted, samePlace, showsTheEnd } from '$lib/shared/reading-place';
import type { ImagePlace, ReadingPlace } from '$lib/shared/reading-place';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import { readingPosition } from '../domain/reading-position';
import { saveReadingPlaceMutation } from '../queries/viewing-queries';
import type { PlaceRequest } from '../queries/viewing-queries';
import { BookPreferences, describeEditFailure, languageOnly } from './book-preferences.svelte';
import type { BookChanged, LanguageEdit } from './book-preferences.svelte';
import { PageGrouping } from './page-grouping.svelte';
import { AT_THE_FIRST_IMAGE, PageNavigation } from './page-navigation.svelte';
import { NOT_OPENED, OPENING, heldBook, shownBook, withBook } from './reader-opening';
import type { OpenOutcome, ReaderBook, ReaderOpening } from './reader-opening';
import { describeOpenFailure, lostBook } from './reader-failure-text';
import { createRegionSelection } from './region-selection.svelte';
import type { RegionSelectionHook } from './region-selection.svelte';

type PlaceOutcome = Awaited<ReturnType<Container['library']['saveReadingPlace']>>;

type PlaceMirror = (place: ShownPlace) => void;

type LanguageKnown = (book: BookId, language: Language) => void;

class ReaderView {
  opening = $state.raw<ReaderOpening>(NOT_OPENED);
  readonly selection: RegionSelectionHook;
  readonly grouping: PageGrouping;
  readonly navigation: PageNavigation;
  readonly preferences: BookPreferences;

  #container: Container;
  #mirror: PlaceMirror | null;
  #languageKnown: LanguageKnown | null;
  #placing: WriteQuery<PlaceOutcome, PlaceRequest>;
  #source: PageSource | null = null;
  #generation = 0;
  #places: PlaceKeeper<ImagePlace>;

  constructor(
    container: Container,
    notify: Notify,
    mirror: PlaceMirror | null = null,
    languageKnown: LanguageKnown | null = null,
    bookChanged: BookChanged | null = null,
    languageEdit: LanguageEdit = languageOnly,
  ) {
    this.#container = container;
    this.#mirror = mirror;
    this.#languageKnown = languageKnown;
    this.#placing = writeQuery(() => ({
      ...saveReadingPlaceMutation(container.library),
      onSuccess: (saved) => {
        if (saved.kind === 'success') bookChanged?.();
      },
    }));
    const book = (): ReaderBook | null => this.book;
    const generation = (): number => this.#generation;
    this.#places = new PlaceKeeper({
      save: (id, place) => this.#savePlace(id, place),
      notify,
      afterFailure: 'keeps-place',
      generation,
      onSettle: (place) =>
        this.#mirror?.({
          kind: 'moved',
          index: place.index,
          group: this.grouping.groupHolding(place.index),
        }),
    });
    this.selection = createRegionSelection();
    this.grouping = new PageGrouping(container, book, generation, (regrouped) =>
      this.#keepShownThroughCurrent(regrouped),
    );
    this.navigation = new PageNavigation(book, this.grouping, this.#places, this.selection);
    this.preferences = new BookPreferences(
      container,
      notify,
      () => this.opening,
      generation,
      this.selection,
      (saved) => this.#hold(saved),
      bookChanged,
      languageEdit,
    );
  }

  get book(): ReaderBook | null {
    return shownBook(this.opening);
  }

  get source(): PageSource | null {
    return this.#source;
  }

  get direction(): ReadingDirection {
    const book = this.book;
    return book === null ? 'ltr' : effectiveDirection(book.direction, book.layoutKind);
  }

  get language(): Language | null {
    return heldBook(this.opening)?.language ?? null;
  }

  get layout(): ImageLayoutKind | null {
    const book = this.book;
    return book === null ? null : imageLayoutKind(book.layoutKind);
  }

  async open(id: BookId, at: ImageIndex | null = null): Promise<void> {
    this.#places.flush();
    const generation = ++this.#generation;
    this.#release();
    this.opening = OPENING;
    this.grouping.reset();
    this.selection.clear();
    this.navigation.position = AT_THE_FIRST_IMAGE;
    this.#places.restart();

    let opened: OpenOutcome;
    try {
      opened = await this.#container.library.openForReading(id);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.opening = {
        kind: 'failed',
        message: `That book could not be opened: ${describeCause(cause)}`,
      };
      return;
    }

    if (generation !== this.#generation) {
      if (opened.kind === 'images') opened.pages.close();
      return;
    }

    if (opened.kind === 'flow') {
      this.opening = { kind: 'flow', book: opened.book };
      return;
    }

    if (opened.kind !== 'images') {
      const message = describeOpenFailure(opened);
      this.opening = { kind: lostBook(opened) ? 'missing' : 'failed', message };
      return;
    }

    const { book, pages } = opened;
    this.#source = pages;
    this.opening = { kind: 'images', book, notice: null };
    this.#languageKnown?.(book.id, book.language);
    this.grouping.start(book);
    void this.grouping.seed(pages, generation);
    const saved = book.position;
    const place = openingPlace(at, saved, book.imageCount);
    if (this.grouping.groups.length === 0) this.opening = { kind: 'empty', book };
    if (place === null) return;

    this.navigation.position = readingPosition(place.index, place.offset);
    this.#places.assumeStored(
      saved.kind === 'image' && saved.index === place.index ? saved : imagePlace(place.index),
    );
    if (place.clamped) {
      const notice = `This book holds ${book.imageCount} images, so it opened at the last one.`;
      if (this.opening.kind === 'images') this.opening = { ...this.opening, notice };
    }
    const showing = this.grouping.placeShowing(place.index);
    const movedByTheUrl = place.asked && saved.kind === 'image' && place.index !== saved.index;
    if (movedByTheUrl || this.#opensOnAnUnreadEnd(book, saved, showing)) {
      void this.#places.persist(book.id, showing);
    }
    this.#mirror?.({ kind: 'arrived', index: place.index });
  }

  async pictureAt(index: ImageIndex): Promise<PagePicture | null> {
    const source = this.#source;
    if (source === null) return null;
    const generation = this.#generation;

    let got: Awaited<ReturnType<PageSource['picture']>>;
    try {
      got = await source.picture(index);
    } catch {
      return null;
    }

    if (generation !== this.#generation) {
      if (got.kind === 'success') releasePicture(got.picture);
      return null;
    }

    if (got.kind !== 'success') return null;

    const picture = got.picture;
    if (picture.kind === 'drawn') {
      this.grouping.measure(index, { width: picture.bitmap.width, height: picture.bitmap.height });
    }
    return picture;
  }

  dispose(): void {
    this.#places.flush();
    this.#generation += 1;
    this.#release();
    this.opening = NOT_OPENED;
    this.grouping.reset();
    this.selection.clear();
    this.preferences.saving = false;
    this.#places.assumeStored(null);
  }

  async #savePlace(id: BookId, place: ImagePlace): Promise<PlaceSaved> {
    const saved = await this.#placing.run({ id, place });
    if (saved.kind !== 'success') return { kind: 'refused', message: describeEditFailure(saved) };
    return PLACE_KEPT;
  }

  #hold(saved: ReaderBook): void {
    if (imageLayoutKind(saved.layoutKind) === null) {
      this.opening = { kind: 'flow', book: saved };
      return;
    }
    const before = this.book?.language ?? null;
    this.opening = withBook(this.opening, saved);
    if (this.opening.kind !== 'flow' && saved.language !== before) {
      this.#languageKnown?.(saved.id, saved.language);
    }
    this.grouping.regroup(saved, this.grouping.sizes);
  }

  #keepShownThroughCurrent(book: ReaderBook): void {
    if (imageLayoutKind(book.layoutKind) !== 'paged') return;
    const recorded = this.#places.latest;
    const at = this.navigation.position.index;
    if (recorded === null || recorded.index !== at) return;

    const showing = this.grouping.placeShowing(at);
    if (samePlace(showing, recorded)) return;
    const readingAt = (place: ImagePlace): boolean =>
      place.index !== 0 || showsTheEnd(place, book.imageCount);
    if (readingAt(showing) || readingAt(recorded)) this.#places.schedule(book.id, showing);
  }

  #opensOnAnUnreadEnd(book: ReaderBook, saved: ReadingPlace, showing: ImagePlace): boolean {
    if (imageLayoutKind(book.layoutKind) !== 'paged' || saved.kind !== 'image') return false;
    if (!showsTheEnd(showing, book.imageCount)) return false;
    const recorded =
      samePlace(saved, showing) && readingStarted(saved, book.imageCount, book.lastReadAt);
    return !recorded;
  }

  #release(): void {
    this.#source?.close();
    this.#source = null;
  }
}

export { ReaderView };
export type { LanguageKnown, PlaceMirror };
