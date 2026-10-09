import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { releasePicture } from '$lib/platform/image/bitmap';
import { describeCause } from '$lib/shared/cause';
import type { Size } from '$lib/shared/geometry';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import { effectiveDirection, imageLayoutKind } from '$lib/shared/layout-kind';
import type {
  ImageLayoutKind,
  PagePairingChoice,
  ReadingDirection,
  ScreenWidth,
} from '$lib/shared/layout-kind';
import type { PageFit } from '$lib/shared/page-fit';
import type { PagePicture, PageSource } from '$lib/shared/page-source';
import { openingPlace } from '$lib/shared/reader-location';
import type { ShownPlace } from '$lib/shared/reader-location';
import { PLACE_KEPT, PlaceKeeper } from '$lib/shared/place-keeper';
import type { PlaceSaved } from '$lib/shared/place-keeper';
import { imagePlace } from '$lib/shared/reading-place';
import type { ImagePlace } from '$lib/shared/reading-place';
import { writeQuery } from '$lib/shared/write-query.svelte';
import type { WriteQuery } from '$lib/shared/write-query.svelte';
import type { PageGroup } from '../domain/page-pairing';
import { positionOfGroup, readingPosition } from '../domain/reading-position';
import type { ReadingPosition } from '../domain/reading-position';
import { saveReadingPlaceMutation } from '../queries/viewing-queries';
import type { PlaceRequest } from '../queries/viewing-queries';
import {
  BookPreferences,
  DIRECTION_FAILED,
  FIT_FAILED,
  LANGUAGE_FAILED,
  LAYOUT_FAILED,
  PAIRING_FAILED,
  describeEditFailure,
  languageOnly,
  regroups,
} from './book-preferences.svelte';
import type { BookChanged, LanguageEdit } from './book-preferences.svelte';
import {
  groupHolding,
  groupsOf,
  mergedSizes,
  pairingOf,
  placeShowing,
  unmeasured,
} from './page-grouping-rules';
import { AT_THE_FIRST_IMAGE, createPagePosition } from './page-position.svelte';
import { besidePagesOf, groupIndexOf, imageTarget, visiblePagesOf } from './page-position-rules';
import { createPageSizes } from './page-sizes.svelte';
import { opensOnAnUnreadEnd, shownThroughCurrent } from './place-rules';
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
  readonly preferences: BookPreferences;
  readonly sizes = createPageSizes();

  #container: Container;
  #mirror: PlaceMirror | null;
  #languageKnown: LanguageKnown | null;
  #languageEdit: LanguageEdit;
  #placing: WriteQuery<PlaceOutcome, PlaceRequest>;
  #source: PageSource | null = null;
  #generation = 0;
  #places: PlaceKeeper<ImagePlace>;
  #position = createPagePosition();
  #screen = $state<ScreenWidth>('wide');
  #pairing = $derived(pairingOf(this.book, this.#screen));
  readonly groups = $derived(groupsOf(this.book, this.sizes.sizes, this.#pairing));
  readonly group = $derived(groupIndexOf(this.groups, this.position));
  readonly visiblePages = $derived(visiblePagesOf(this.groups, this.group));
  readonly besidePages = $derived(besidePagesOf(this.groups, this.group));

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
    this.#languageEdit = languageEdit;
    this.#placing = writeQuery(() => ({
      ...saveReadingPlaceMutation(container.library),
      onSuccess: (saved) => {
        if (saved.kind === 'success') bookChanged?.();
      },
    }));
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
          group: groupHolding(this.groups, place.index),
        }),
    });
    this.selection = createRegionSelection();
    this.preferences = new BookPreferences(
      container,
      notify,
      generation,
      (saved) => this.#hold(saved),
      bookChanged,
    );
  }

  get book(): ReaderBook | null {
    return shownBook(this.opening);
  }

  get source(): PageSource | null {
    return this.#source;
  }

  get position(): ReadingPosition {
    return this.#position.position;
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

  fitScreen(screen: ScreenWidth): void {
    this.#screen = screen;
  }

  measure(index: ImageIndex, size: Size): void {
    if (this.book === null) return;
    this.sizes.measure(index, size);
  }

  keepShownThroughCurrent(groups: readonly PageGroup[]): void {
    const book = this.book;
    if (book === null) return;

    const at = this.position.index;
    const kept = shownThroughCurrent(book, this.#places.latest, at, placeShowing(groups, at));
    if (kept !== null) this.#places.schedule(book.id, kept);
  }

  next(): Promise<void> {
    return this.goToGroup(this.group + 1);
  }

  previous(): Promise<void> {
    return this.goToGroup(this.group - 1);
  }

  async goToGroup(target: number): Promise<void> {
    const book = this.book;
    if (book === null || target === this.group) return;

    const moved = positionOfGroup(this.groups, target);
    if (moved === null) return;

    this.#position.set(moved);
    this.selection.clear();
    const place = placeShowing(this.groups, moved.index);
    this.#places.schedule(book.id, place);
    await this.#places.persist(book.id, place);
  }

  async goToImage(id: BookId, index: ImageIndex): Promise<void> {
    const book = this.book;
    if (book === null || book.id !== id) return;

    const target = imageTarget(book, index, this.groups, this.position);
    await match(target)
      .with({ kind: 'none' }, () => undefined)
      .with({ kind: 'position' }, ({ position }) => this.moveTo(position))
      .with({ kind: 'group' }, ({ group }) => this.goToGroup(group))
      .exhaustive();
  }

  moveTo(position: ReadingPosition, shownThrough: ImageIndex = position.index): void {
    const book = this.book;
    if (book === null) return;

    const held = this.position;
    if (position.index === held.index && position.offset === held.offset) return;

    this.#position.set(position);
    this.#places.schedule(book.id, imagePlace(position.index, shownThrough, position.offset));
  }

  async setLayoutKind(kind: ImageLayoutKind): Promise<void> {
    const book = this.book;
    if (book === null || this.preferences.saving || book.layoutKind === kind) return;
    this.selection.clear();
    await this.preferences.edit(book.id, { layoutKind: kind }, LAYOUT_FAILED);
  }

  async setPairing(pairing: PagePairingChoice): Promise<void> {
    const book = this.book;
    if (book === null || this.preferences.saving || book.pagePairing === pairing) return;
    this.selection.clear();
    await this.preferences.edit(book.id, { pagePairing: pairing }, PAIRING_FAILED);
  }

  async setDirection(direction: ReadingDirection): Promise<void> {
    const book = this.book;
    if (book === null || this.preferences.saving || book.direction === direction) return;
    await this.preferences.edit(book.id, { direction }, DIRECTION_FAILED);
  }

  async setLanguage(language: Language): Promise<void> {
    const book = heldBook(this.opening);
    if (book === null || this.preferences.saving || book.language === language) return;
    const edit = this.#languageEdit(book, language);
    if (regroups(edit)) this.selection.clear();
    await this.preferences.edit(book.id, edit, LANGUAGE_FAILED);
  }

  async setPageFit(fit: PageFit): Promise<void> {
    const book = this.book;
    if (book === null || book.pageFit === fit) return;
    await this.preferences.edit(book.id, { pageFit: fit }, FIT_FAILED);
  }

  async open(id: BookId, at: ImageIndex | null = null): Promise<void> {
    this.#places.flush();
    const generation = ++this.#generation;
    this.#release();
    this.opening = OPENING;
    this.sizes.reset();
    this.selection.clear();
    this.#position.set(AT_THE_FIRST_IMAGE);
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
    this.sizes.set(unmeasured(book.imageCount));
    void this.#seedSizes(pages, generation);
    const saved = book.position;
    const place = openingPlace(at, saved, book.imageCount);
    if (this.groups.length === 0) this.opening = { kind: 'empty', book };
    if (place === null) return;

    this.#position.set(readingPosition(place.index, place.offset));
    this.#places.assumeStored(
      saved.kind === 'image' && saved.index === place.index ? saved : imagePlace(place.index),
    );
    if (place.clamped) {
      const notice = `This book holds ${book.imageCount} images, so it opened at the last one.`;
      if (this.opening.kind === 'images') this.opening = { ...this.opening, notice };
    }
    const showing = placeShowing(this.groups, place.index);
    const movedByTheUrl = place.asked && saved.kind === 'image' && place.index !== saved.index;
    if (movedByTheUrl || opensOnAnUnreadEnd(book, saved, showing)) {
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
      this.measure(index, { width: picture.bitmap.width, height: picture.bitmap.height });
    }
    return picture;
  }

  dispose(): void {
    this.#places.flush();
    this.#generation += 1;
    this.#release();
    this.opening = NOT_OPENED;
    this.sizes.reset();
    this.selection.clear();
    this.preferences.saving = false;
    this.#places.assumeStored(null);
  }

  async #seedSizes(source: PageSource, generation: number): Promise<void> {
    let read: Awaited<ReturnType<PageSource['sizes']>>;
    try {
      read = await this.#container.library.readPageSizes(source);
    } catch {
      return;
    }

    if (generation !== this.#generation || this.book === null || read.kind !== 'success') return;

    this.sizes.set(mergedSizes(this.sizes.sizes, read.sizes));
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
  }

  #release(): void {
    this.#source?.close();
    this.#source = null;
  }
}

export { ReaderView };
export type { LanguageKnown, PlaceMirror };
