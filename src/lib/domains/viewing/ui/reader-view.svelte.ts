import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { releasePicture } from '$lib/platform/image/bitmap';
import { describeCause } from '$lib/shared/cause';
import { unexpectedMessage } from '$lib/shared/unexpected-failure';
import type { Size } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { Notify } from '$lib/shared/notice';
import { effectiveDirection, effectivePairing, imageLayoutKind } from '$lib/shared/layout-kind';
import type { ImageLayoutKind, PagePairing, ReadingDirection } from '$lib/shared/layout-kind';
import type { PageFit } from '$lib/shared/page-fit';
import type { PagePicture, PageSource, PageSourceError } from '$lib/shared/page-source';
import { openingPlace } from '$lib/shared/reader-location';
import type { ShownPlace } from '$lib/shared/reader-location';
import { PLACE_KEPT, PlaceKeeper } from '$lib/shared/place-keeper';
import type { PlaceSaved } from '$lib/shared/place-keeper';
import { imagePlace, readingStarted, samePlace, showsTheEnd } from '$lib/shared/reading-place';
import type { ImagePlace, ReadingPlace } from '$lib/shared/reading-place';
import { groupContaining, pairPages } from '../domain/page-pairing';
import type { PageGroup } from '../domain/page-pairing';
import { groupOf, positionOfGroup, readingPosition } from '../domain/reading-position';
import type { ReadingPosition } from '../domain/reading-position';
import type { PageMove } from './page-moves';
import { NOT_OPENED, OPENING, heldBook, shownBook, withBook } from './reader-opening';
import type { OpenOutcome, ReaderBook, ReaderOpening } from './reader-opening';

type EditOutcome = Awaited<ReturnType<Container['library']['editBook']>>;

type BookEdit = Parameters<Container['library']['editBook']>[1];

type OpenFailure = Exclude<OpenOutcome, { readonly kind: 'images' | 'flow' }>;

type EditFailure = Exclude<EditOutcome, { readonly kind: 'success' }>;

type PlaceMirror = (place: ShownPlace) => void;

type LanguageKnown = (book: BookId, language: Language) => void;

type BookChanged = () => void;

const NO_PAGES: PageGroup = [];

const NO_GROUPS: readonly PageGroup[] = [];

const AT_THE_FIRST_IMAGE: ReadingPosition = readingPosition(imageIndex(0), 0);

const LAYOUT_FAILED = 'Could not change the layout';

const PAIRING_FAILED = 'Could not change the page pairing';

const DIRECTION_FAILED = 'Could not change the reading direction';

const FIT_FAILED = 'Could not change the page fit';

const LANGUAGE_FAILED = 'Could not change the language';

const SOURCE_MISSING =
  'The file of this book is missing from this device. Remove the book and add it again.';

function describeEditFailure(error: EditFailure): string {
  return match(error)
    .with({ kind: 'not-found' }, () => 'That book is no longer in your library.')
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so your place cannot be kept.',
    )
    .exhaustive();
}

function describeSourceFailure(error: PageSourceError): string {
  return match(error)
    .with(
      { kind: 'out-of-range' },
      (range) => `This book holds ${range.count} images, so page ${range.index + 1} is not there.`,
    )
    .with(
      { kind: 'page-unreadable' },
      (failed) => `A page could not be read from that book: ${failed.cause}`,
    )
    .with({ kind: 'decode-failed' }, (failed) => `A page could not be decoded: ${failed.cause}`)
    .with({ kind: 'render-failed' }, (failed) => `A page could not be rendered: ${failed.cause}`)
    .with(
      { kind: 'source-unreadable' },
      (unreadable) => `That book could not be read: ${unreadable.cause}`,
    )
    .exhaustive();
}

function lostBook(error: OpenFailure): boolean {
  return error.kind === 'not-found';
}

function describeOpenFailure(error: OpenFailure): string {
  return match(error)
    .with({ kind: 'unreadable' }, (failed) => describeSourceFailure(failed.failure))
    .with({ kind: 'not-found' }, { kind: 'storage-unavailable' }, describeEditFailure)
    .with({ kind: 'source-missing' }, () => SOURCE_MISSING)
    .exhaustive();
}

function unmeasured(count: number): readonly (Size | null)[] {
  return Array.from({ length: Math.max(count, 0) }, () => null);
}

class ReaderView {
  opening = $state.raw<ReaderOpening>(NOT_OPENED);
  saving = $state(false);
  sizes = $state.raw<readonly (Size | null)[]>([]);
  groups = $state.raw<readonly PageGroup[]>([]);
  position = $state.raw<ReadingPosition>(AT_THE_FIRST_IMAGE);
  regions = $state.raw<readonly ImageRegion[]>([]);

  #container: Container;
  #notify: Notify;
  #mirror: PlaceMirror | null;
  #languageKnown: LanguageKnown | null;
  #bookChanged: BookChanged | null;
  #source: PageSource | null = null;
  #generation = 0;
  #places: PlaceKeeper<ImagePlace>;

  constructor(
    container: Container,
    notify: Notify,
    mirror: PlaceMirror | null = null,
    languageKnown: LanguageKnown | null = null,
    bookChanged: BookChanged | null = null,
  ) {
    this.#container = container;
    this.#notify = notify;
    this.#mirror = mirror;
    this.#languageKnown = languageKnown;
    this.#bookChanged = bookChanged;
    this.#places = new PlaceKeeper({
      save: (id, place) => this.#savePlace(id, place),
      notify,
      afterFailure: 'keeps-place',
      generation: () => this.#generation,
      onSettle: (place) =>
        this.#mirror?.({
          kind: 'moved',
          index: place.index,
          group: this.#groupHolding(place.index),
        }),
    });
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

  get group(): number {
    const found = groupOf(this.groups, this.position);
    return found < 0 ? 0 : found;
  }

  get visiblePages(): PageGroup {
    return this.groups[this.group] ?? NO_PAGES;
  }

  get besidePages(): Readonly<Record<PageMove, PageGroup | null>> {
    const at = this.group;
    return { decrement: this.groups[at - 1] ?? null, increment: this.groups[at + 1] ?? null };
  }

  async open(id: BookId, at: ImageIndex | null = null): Promise<void> {
    this.#places.flush();
    const generation = ++this.#generation;
    this.#release();
    this.opening = OPENING;
    this.sizes = [];
    this.groups = [];
    this.regions = [];
    this.position = AT_THE_FIRST_IMAGE;
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
    this.#regroup(book, unmeasured(book.imageCount));
    void this.#seedSizes(pages, generation);
    const saved = book.position;
    const place = openingPlace(at, saved, book.imageCount);
    if (this.groups.length === 0) this.opening = { kind: 'empty', book };
    if (place === null) return;

    this.position = readingPosition(place.index, place.offset);
    this.#places.assumeStored(
      saved.kind === 'image' && saved.index === place.index ? saved : imagePlace(place.index),
    );
    if (place.clamped) {
      const notice = `This book holds ${book.imageCount} images, so it opened at the last one.`;
      if (this.opening.kind === 'images') this.opening = { ...this.opening, notice };
    }
    const showing = this.#placeShowing(place.index);
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
      this.measure(index, { width: picture.bitmap.width, height: picture.bitmap.height });
    }
    return picture;
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

    this.position = moved;
    this.clearSelection();
    const place = this.#placeShowing(moved.index);
    this.#places.schedule(book.id, place);
    await this.#places.persist(book.id, place);
  }

  async goToImage(id: BookId, index: ImageIndex): Promise<void> {
    const book = this.book;
    if (book === null || book.id !== id || book.imageCount === 0) return;

    const wanted = imageIndex(Math.min(Math.max(index, 0), book.imageCount - 1));
    if (wanted === this.position.index) return;

    if (book.layoutKind === 'continuous') {
      this.moveTo(readingPosition(wanted, 0));
      return;
    }

    const group = groupContaining(this.groups, wanted);
    if (group >= 0) await this.goToGroup(group);
  }

  moveTo(position: ReadingPosition, shownThrough: ImageIndex = position.index): void {
    const book = this.book;
    if (book === null) return;

    const held = this.position;
    if (position.index === held.index && position.offset === held.offset) return;

    this.position = position;
    this.#places.schedule(book.id, imagePlace(position.index, shownThrough, position.offset));
  }

  async setLayoutKind(kind: ImageLayoutKind): Promise<void> {
    const book = this.book;
    if (book === null || this.saving || book.layoutKind === kind) return;
    this.clearSelection();
    await this.#edit(book.id, { layoutKind: kind }, LAYOUT_FAILED);
  }

  async setPairing(pairing: PagePairing): Promise<void> {
    const book = this.book;
    if (book === null || this.saving || book.pagePairing === pairing) return;
    this.clearSelection();
    await this.#edit(book.id, { pagePairing: pairing }, PAIRING_FAILED);
  }

  async setDirection(direction: ReadingDirection): Promise<void> {
    const book = this.book;
    if (book === null || this.saving || book.direction === direction) return;
    await this.#edit(book.id, { direction }, DIRECTION_FAILED);
  }

  async setLanguage(language: Language): Promise<void> {
    const book = heldBook(this.opening);
    if (book === null || this.saving || book.language === language) return;
    await this.#edit(book.id, { language }, LANGUAGE_FAILED);
  }

  async setPageFit(fit: PageFit): Promise<void> {
    const book = this.book;
    if (book === null || book.pageFit === fit) return;
    await this.#edit(book.id, { pageFit: fit }, FIT_FAILED);
  }

  select(regions: readonly ImageRegion[]): void {
    this.regions = regions;
  }

  clearSelection(): void {
    if (this.regions.length > 0) this.regions = [];
  }

  dispose(): void {
    this.#places.flush();
    this.#generation += 1;
    this.#release();
    this.opening = NOT_OPENED;
    this.sizes = [];
    this.groups = [];
    this.regions = [];
    this.saving = false;
    this.#places.assumeStored(null);
  }

  async #savePlace(id: BookId, place: ImagePlace): Promise<PlaceSaved> {
    const saved = await this.#container.library.saveReadingPlace(id, place);
    if (saved.kind !== 'success') return { kind: 'refused', message: describeEditFailure(saved) };
    this.#bookChanged?.();
    return PLACE_KEPT;
  }

  async #edit(id: BookId, edit: BookEdit, failed: string): Promise<void> {
    const generation = this.#generation;
    this.saving = true;

    try {
      const saved = await this.#container.library.editBook(id, edit);
      if (saved.kind === 'success') this.#bookChanged?.();
      if (generation !== this.#generation) return;
      if (saved.kind !== 'success') {
        this.#fail(failed, describeEditFailure(saved));
        return;
      }
      this.#hold(saved.book);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.#fail(failed, unexpectedMessage(cause));
    } finally {
      this.saving = false;
    }
  }

  measure(index: ImageIndex, size: Size): void {
    const book = this.book;
    if (book === null || index < 0 || index >= this.sizes.length) return;

    const known = this.sizes[index] ?? null;
    if (known !== null && known.width === size.width && known.height === size.height) return;

    const sizes = [...this.sizes];
    sizes[index] = size;
    this.#regroup(book, sizes);
  }

  async #seedSizes(source: PageSource, generation: number): Promise<void> {
    let read: Awaited<ReturnType<PageSource['sizes']>>;
    try {
      read = await this.#container.library.readPageSizes(source);
    } catch {
      return;
    }

    const book = this.book;
    if (generation !== this.#generation || book === null || read.kind !== 'success') return;

    const found = read.sizes;
    const sizes = this.sizes.map((known, index) => known ?? found[index] ?? null);
    if (sizes.every((size, index) => size === this.sizes[index])) return;
    this.#regroup(book, sizes);
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
    this.#regroup(saved, this.sizes);
  }

  #regroup(book: ReaderBook, sizes: readonly (Size | null)[]): void {
    this.sizes = sizes;
    const layout = imageLayoutKind(book.layoutKind);
    this.groups =
      layout === null ? NO_GROUPS : pairPages(sizes, effectivePairing(book.pagePairing, layout));
    this.#keepShownThroughCurrent(book);
  }

  #keepShownThroughCurrent(book: ReaderBook): void {
    if (imageLayoutKind(book.layoutKind) !== 'paged') return;
    const recorded = this.#places.latest;
    const at = this.position.index;
    if (recorded === null || recorded.index !== at) return;

    const showing = this.#placeShowing(at);
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

  #groupHolding(index: ImageIndex): PageGroup {
    return this.groups[groupContaining(this.groups, index)] ?? NO_PAGES;
  }

  #placeShowing(index: ImageIndex): ImagePlace {
    const group = this.groups[groupContaining(this.groups, index)] ?? NO_PAGES;
    return imagePlace(index, group.at(-1) ?? index);
  }

  #fail(title: string, message: string): void {
    this.#notify({ tone: 'danger', title, message });
  }

  #release(): void {
    this.#source?.close();
    this.#source = null;
  }
}

export {
  DIRECTION_FAILED,
  FIT_FAILED,
  LANGUAGE_FAILED,
  LAYOUT_FAILED,
  PAIRING_FAILED,
  SOURCE_MISSING,
  ReaderView,
};
export type { BookChanged, LanguageKnown, PlaceMirror };
