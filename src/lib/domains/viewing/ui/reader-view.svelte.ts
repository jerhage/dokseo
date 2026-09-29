import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { releasePicture } from '$lib/platform/image/bitmap';
import { describeCause } from '$lib/shared/cause';
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
import { imagePlace, readingStarted, samePlace, showsTheEnd } from '$lib/shared/reading-place';
import type { ImagePlace, ReadingPlace } from '$lib/shared/reading-place';
import { groupContaining, pairPages } from '../domain/page-pairing';
import type { PageGroup } from '../domain/page-pairing';
import { groupOf, positionOfGroup, readingPosition } from '../domain/reading-position';
import type { ReadingPosition } from '../domain/reading-position';
import type { PageMove } from './page-moves';

type OpenOutcome = Awaited<ReturnType<Container['library']['openForReading']>>;

type EditOutcome = Awaited<ReturnType<Container['library']['editBook']>>;

type BookEdit = Parameters<Container['library']['editBook']>[1];

type OpenedBook = Extract<OpenOutcome, { readonly ok: true }>['value'];

type OpenedImages = Extract<OpenedBook, { readonly kind: 'images' }>;

type OpenedFlow = Extract<OpenedBook, { readonly kind: 'flow' }>;

type OpenFailure = Extract<OpenOutcome, { readonly ok: false }>['error'];

type EditFailure = Extract<EditOutcome, { readonly ok: false }>['error'];

type ReaderBook = OpenedImages['book'];

type FlowBook = OpenedFlow['book'];

type ReaderStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'failed' | 'missing' | 'flow';

type PlaceMirror = (place: ShownPlace) => void;

const NO_PAGES: PageGroup = [];

const NO_GROUPS: readonly PageGroup[] = [];

const AT_THE_FIRST_IMAGE: ReadingPosition = readingPosition(imageIndex(0), 0);

const PLACE_SAVE_DELAY_MS = 500;

const LAYOUT_FAILED = 'Could not change the layout';

const PAIRING_FAILED = 'Could not change the page pairing';

const DIRECTION_FAILED = 'Could not change the reading direction';

const FIT_FAILED = 'Could not change the page fit';

const LANGUAGE_FAILED = 'Could not change the language';

const PLACE_FAILED = 'Could not save your place';

type PendingSave = {
  readonly id: BookId;
  readonly place: ImagePlace;
  readonly timer: ReturnType<typeof setTimeout>;
};

function describeEditFailure(error: EditFailure): string {
  return match(error)
    .with({ kind: 'not-found' }, () => 'That book is no longer in your library.')
    .with(
      { kind: 'storage-unavailable' },
      () => 'This browser blocks local storage, so your place cannot be kept.',
    )
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
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
  return error.kind === 'library' && error.error.kind === 'not-found';
}

function describeOpenFailure(error: OpenFailure): string {
  if (error.kind === 'source') return describeSourceFailure(error.error);
  if (error.kind === 'library') return describeEditFailure(error.error);
  const unhandled: never = error;
  return unhandled;
}

function unmeasured(count: number): readonly (Size | null)[] {
  return Array.from({ length: Math.max(count, 0) }, () => null);
}

class ReaderView {
  status = $state<ReaderStatus>('idle');
  message = $state<string | null>(null);
  book = $state.raw<ReaderBook | null>(null);
  flowBook = $state.raw<FlowBook | null>(null);
  saving = $state(false);
  sizes = $state.raw<readonly (Size | null)[]>([]);
  groups = $state.raw<readonly PageGroup[]>([]);
  position = $state.raw<ReadingPosition>(AT_THE_FIRST_IMAGE);
  regions = $state.raw<readonly ImageRegion[]>([]);

  #container: Container;
  #notify: Notify;
  #mirror: PlaceMirror | null;
  #source: PageSource | null = null;
  #generation = 0;
  #saving: PendingSave | null = null;
  #placed: ImagePlace | null = null;
  #placeFailing = false;

  constructor(container: Container, notify: Notify, mirror: PlaceMirror | null = null) {
    this.#container = container;
    this.#notify = notify;
    this.#mirror = mirror;
  }

  get source(): PageSource | null {
    return this.#source;
  }

  get direction(): ReadingDirection {
    const book = this.book;
    return book === null ? 'ltr' : effectiveDirection(book.direction, book.layoutKind);
  }

  get language(): Language | null {
    return this.book?.language ?? this.flowBook?.language ?? null;
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
    this.#flushSave();
    const generation = ++this.#generation;
    this.#release();
    this.status = 'loading';
    this.message = null;
    this.book = null;
    this.flowBook = null;
    this.sizes = [];
    this.groups = [];
    this.regions = [];
    this.position = AT_THE_FIRST_IMAGE;
    this.#placed = null;
    this.#placeFailing = false;

    let opened: OpenOutcome;
    try {
      opened = await this.#container.library.openForReading(id);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.status = 'failed';
      this.message = `That book could not be opened: ${String(cause)}`;
      return;
    }

    if (generation !== this.#generation) {
      if (opened.ok && opened.value.kind === 'images') opened.value.pages.close();
      return;
    }

    if (!opened.ok) {
      this.status = lostBook(opened.error) ? 'missing' : 'failed';
      this.message = describeOpenFailure(opened.error);
      return;
    }

    if (opened.value.kind === 'flow') {
      this.flowBook = opened.value.book;
      this.status = 'flow';
      return;
    }

    const { book, pages } = opened.value;
    this.#source = pages;
    this.book = book;
    this.#regroup(book, unmeasured(book.imageCount));
    void this.#seedSizes(pages, generation);
    const saved = book.position;
    const place = openingPlace(at, saved, book.imageCount);
    this.status = this.groups.length === 0 ? 'empty' : 'ready';
    if (place === null) return;

    this.position = readingPosition(place.index, 0);
    this.#placed =
      saved.kind === 'image' && saved.index === place.index ? saved : imagePlace(place.index);
    if (place.clamped) {
      this.message = `This book holds ${book.imageCount} images, so it opened at the last one.`;
    }
    const showing = this.#placeShowing(place.index);
    const movedByTheUrl = place.asked && saved.kind === 'image' && place.index !== saved.index;
    if (movedByTheUrl || this.#opensOnAnUnreadEnd(book, saved, showing)) {
      void this.#persist(book.id, showing);
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
      if (got.ok) releasePicture(got.value);
      return null;
    }

    if (!got.ok) return null;

    const picture = got.value;
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
    this.#scheduleSave(book.id, place);
    await this.#persist(book.id, place);
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
    this.#scheduleSave(book.id, imagePlace(position.index, shownThrough));
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
    const book = this.book ?? this.flowBook;
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
    this.#flushSave();
    this.#generation += 1;
    this.#release();
    this.book = null;
    this.flowBook = null;
    this.sizes = [];
    this.groups = [];
    this.regions = [];
    this.status = 'idle';
    this.message = null;
    this.saving = false;
    this.#placed = null;
  }

  async #edit(id: BookId, edit: BookEdit, failed: string): Promise<void> {
    const generation = this.#generation;
    this.saving = true;

    try {
      const saved = await this.#container.library.editBook(id, edit);
      if (generation !== this.#generation) return;
      if (!saved.ok) {
        this.#fail(failed, describeEditFailure(saved.error));
        return;
      }
      this.#hold(saved.value);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.#fail(failed, describeCause(cause));
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
    if (generation !== this.#generation || book === null || !read.ok) return;

    const found = read.value;
    const sizes = this.sizes.map((known, index) => known ?? found[index] ?? null);
    if (sizes.every((size, index) => size === this.sizes[index])) return;
    this.#regroup(book, sizes);
  }

  #hold(saved: ReaderBook): void {
    if (imageLayoutKind(saved.layoutKind) === null) {
      this.flowBook = saved;
      return;
    }
    this.book = saved;
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
    const recorded = this.#saving?.place ?? this.#placed;
    const at = this.position.index;
    if (recorded === null || recorded.index !== at) return;

    const showing = this.#placeShowing(at);
    if (samePlace(showing, recorded)) return;
    const readingAt = (place: ImagePlace): boolean =>
      place.index !== 0 || showsTheEnd(place, book.imageCount);
    if (readingAt(showing) || readingAt(recorded)) this.#scheduleSave(book.id, showing);
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

  #scheduleSave(id: BookId, place: ImagePlace): void {
    const waiting = this.#saving;
    if (waiting !== null) clearTimeout(waiting.timer);

    const timer = setTimeout(() => {
      this.#saving = null;
      this.#mirror?.({ kind: 'moved', index: place.index, group: this.#groupHolding(place.index) });
      if (!this.#alreadyPlaced(place)) void this.#persist(id, place);
    }, PLACE_SAVE_DELAY_MS);

    this.#saving = { id, place, timer };
  }

  #alreadyPlaced(place: ImagePlace): boolean {
    const placed = this.#placed;
    return placed !== null && samePlace(placed, place);
  }

  #flushSave(): void {
    const waiting = this.#saving;
    if (waiting === null) return;

    clearTimeout(waiting.timer);
    this.#saving = null;
    if (this.#alreadyPlaced(waiting.place)) return;
    void this.#persist(waiting.id, waiting.place);
  }

  async #persist(id: BookId, place: ImagePlace): Promise<void> {
    const generation = this.#generation;
    this.#placed = place;

    try {
      const saved = await this.#container.library.saveReadingPlace(id, place);
      if (generation !== this.#generation) return;
      if (saved.ok) this.#placeFailing = false;
      else this.#failPlace(describeEditFailure(saved.error));
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.#failPlace(describeCause(cause));
    }
  }

  #failPlace(message: string): void {
    if (this.#placeFailing) return;
    this.#placeFailing = true;
    this.#fail(PLACE_FAILED, message);
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
  PLACE_FAILED,
  PLACE_SAVE_DELAY_MS,
  ReaderView,
};
export type { ReaderBook, ReaderStatus, PlaceMirror };
