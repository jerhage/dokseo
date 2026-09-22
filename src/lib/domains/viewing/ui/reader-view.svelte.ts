import { match } from 'ts-pattern';
import type { Container } from '$lib/container';
import { releasePicture } from '$lib/platform/image/bitmap';
import type { Size } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { effectiveDirection, effectivePairing, imageLayoutKind } from '$lib/shared/layout-kind';
import type { ImageLayoutKind, PagePairing, ReadingDirection } from '$lib/shared/layout-kind';
import type { PageFit } from '$lib/shared/page-fit';
import type { PagePicture, PageSource, PageSourceError } from '$lib/shared/page-source';
import { openingPlace } from '$lib/shared/reader-location';
import { imagePlace } from '$lib/shared/reading-place';
import { groupContaining, pairPages } from '../domain/page-pairing';
import type { PageGroup } from '../domain/page-pairing';
import { groupOf, positionOfGroup, readingPosition } from '../domain/reading-position';
import type { ReadingPosition } from '../domain/reading-position';

type OpenOutcome = Awaited<ReturnType<Container['library']['openForReading']>>;

type EditOutcome = Awaited<ReturnType<Container['library']['editBook']>>;

type BookEdit = Parameters<Container['library']['editBook']>[1];

type OpenedBook = Extract<OpenOutcome, { readonly ok: true }>['value'];

type OpenedImages = Extract<OpenedBook, { readonly kind: 'images' }>;

type OpenFailure = Extract<OpenOutcome, { readonly ok: false }>['error'];

type EditFailure = Extract<EditOutcome, { readonly ok: false }>['error'];

type ReaderBook = OpenedImages['book'];

type ReaderStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'failed' | 'missing' | 'flow';

type PlaceMirror = (index: ImageIndex) => void;

const NO_PAGES: PageGroup = [];

const NO_GROUPS: readonly PageGroup[] = [];

const AT_THE_FIRST_IMAGE: ReadingPosition = readingPosition(imageIndex(0), 0);

const PLACE_SAVE_DELAY_MS = 500;

type PendingSave = {
  readonly id: BookId;
  readonly index: ImageIndex;
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
  saving = $state(false);
  sizes = $state.raw<readonly (Size | null)[]>([]);
  groups = $state.raw<readonly PageGroup[]>([]);
  position = $state.raw<ReadingPosition>(AT_THE_FIRST_IMAGE);
  regions = $state.raw<readonly ImageRegion[]>([]);

  #container: Container;
  #mirror: PlaceMirror | null;
  #source: PageSource | null = null;
  #generation = 0;
  #saving: PendingSave | null = null;
  #placed: ImageIndex | null = null;

  constructor(container: Container, mirror: PlaceMirror | null = null) {
    this.#container = container;
    this.#mirror = mirror;
  }

  get source(): PageSource | null {
    return this.#source;
  }

  get direction(): ReadingDirection {
    const book = this.book;
    return book === null ? 'ltr' : effectiveDirection(book.direction, book.layoutKind);
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

  async open(id: BookId, at: ImageIndex | null = null): Promise<void> {
    this.#flushSave();
    const generation = ++this.#generation;
    this.#release();
    this.status = 'loading';
    this.message = null;
    this.book = null;
    this.sizes = [];
    this.groups = [];
    this.regions = [];
    this.position = AT_THE_FIRST_IMAGE;
    this.#placed = null;

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
      this.status = 'flow';
      return;
    }

    const { book, pages } = opened.value;
    this.#source = pages;
    this.book = book;
    this.#regroup(book, unmeasured(book.imageCount));
    const saved = book.position;
    const place = openingPlace(at, saved, book.imageCount);
    this.status = this.groups.length === 0 ? 'empty' : 'ready';
    if (place === null) return;

    this.position = readingPosition(place.index, 0);
    this.#placed = place.index;
    if (place.clamped) {
      this.message = `This book holds ${book.imageCount} images, so it opened at the last one.`;
    }
    if (place.asked && saved.kind === 'image' && place.index !== saved.index) {
      void this.#persist(book.id, place.index);
    }
    this.#mirror?.(place.index);
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
    this.#scheduleSave(book.id, moved.index);
    await this.#persist(book.id, moved.index);
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

  moveTo(position: ReadingPosition): void {
    const book = this.book;
    if (book === null) return;

    const held = this.position;
    if (position.index === held.index && position.offset === held.offset) return;

    this.position = position;
    this.#scheduleSave(book.id, position.index);
  }

  async setLayoutKind(kind: ImageLayoutKind): Promise<void> {
    const book = this.book;
    if (book === null || this.saving || book.layoutKind === kind) return;
    this.clearSelection();
    await this.#edit(book.id, { layoutKind: kind });
  }

  async setPairing(pairing: PagePairing): Promise<void> {
    const book = this.book;
    if (book === null || this.saving || book.pagePairing === pairing) return;
    this.clearSelection();
    await this.#edit(book.id, { pagePairing: pairing });
  }

  async setDirection(direction: ReadingDirection): Promise<void> {
    const book = this.book;
    if (book === null || this.saving || book.direction === direction) return;
    await this.#edit(book.id, { direction });
  }

  async setPageFit(fit: PageFit): Promise<void> {
    const book = this.book;
    if (book === null || book.pageFit === fit) return;
    await this.#edit(book.id, { pageFit: fit });
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
    this.sizes = [];
    this.groups = [];
    this.regions = [];
    this.status = 'idle';
    this.message = null;
    this.saving = false;
    this.#placed = null;
  }

  async #edit(id: BookId, edit: BookEdit): Promise<void> {
    const generation = this.#generation;
    this.saving = true;
    this.message = null;

    try {
      const saved = await this.#container.library.editBook(id, edit);
      if (generation !== this.#generation) return;
      if (!saved.ok) {
        this.message = describeEditFailure(saved.error);
        return;
      }
      this.book = saved.value;
      this.#regroup(saved.value, this.sizes);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.message = `That change could not be saved: ${String(cause)}`;
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

  #regroup(book: ReaderBook, sizes: readonly (Size | null)[]): void {
    this.sizes = sizes;
    const layout = imageLayoutKind(book.layoutKind);
    this.groups =
      layout === null ? NO_GROUPS : pairPages(sizes, effectivePairing(book.pagePairing, layout));
  }

  #scheduleSave(id: BookId, index: ImageIndex): void {
    const waiting = this.#saving;
    if (waiting !== null) clearTimeout(waiting.timer);

    const timer = setTimeout(() => {
      this.#saving = null;
      this.#mirror?.(index);
      if (index !== this.#placed) void this.#persist(id, index);
    }, PLACE_SAVE_DELAY_MS);

    this.#saving = { id, index, timer };
  }

  #flushSave(): void {
    const waiting = this.#saving;
    if (waiting === null) return;

    clearTimeout(waiting.timer);
    this.#saving = null;
    if (waiting.index === this.#placed) return;
    void this.#persist(waiting.id, waiting.index);
  }

  async #persist(id: BookId, index: ImageIndex): Promise<void> {
    const generation = this.#generation;
    this.#placed = index;

    try {
      const saved = await this.#container.library.editBook(id, { position: imagePlace(index) });
      if (generation !== this.#generation) return;
      if (!saved.ok) this.message = describeEditFailure(saved.error);
    } catch (cause) {
      if (generation !== this.#generation) return;
      this.message = `Your place could not be saved: ${String(cause)}`;
    }
  }

  #release(): void {
    this.#source?.close();
    this.#source = null;
  }
}

export { PLACE_SAVE_DELAY_MS, ReaderView };
export type { ReaderBook, ReaderStatus, PlaceMirror };
