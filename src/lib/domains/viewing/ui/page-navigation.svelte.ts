import { imageIndex } from '$lib/shared/ids';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { PlaceKeeper } from '$lib/shared/place-keeper';
import { imagePlace } from '$lib/shared/reading-place';
import type { ImagePlace } from '$lib/shared/reading-place';
import { groupContaining } from '../domain/page-pairing';
import type { PageGroup } from '../domain/page-pairing';
import { groupOf, positionOfGroup, readingPosition } from '../domain/reading-position';
import type { ReadingPosition } from '../domain/reading-position';
import { NO_PAGES } from './page-grouping.svelte';
import type { PageGrouping } from './page-grouping.svelte';
import type { PageMove } from './page-moves';
import type { ReaderBook } from './reader-opening';
import type { RegionSelectionHook } from './region-selection.svelte';

const AT_THE_FIRST_IMAGE: ReadingPosition = readingPosition(imageIndex(0), 0);

class PageNavigation {
  position = $state.raw<ReadingPosition>(AT_THE_FIRST_IMAGE);

  #book: () => ReaderBook | null;
  #grouping: PageGrouping;
  #places: PlaceKeeper<ImagePlace>;
  #selection: RegionSelectionHook;

  constructor(
    book: () => ReaderBook | null,
    grouping: PageGrouping,
    places: PlaceKeeper<ImagePlace>,
    selection: RegionSelectionHook,
  ) {
    this.#book = book;
    this.#grouping = grouping;
    this.#places = places;
    this.#selection = selection;
  }

  get group(): number {
    const found = groupOf(this.#grouping.groups, this.position);
    return found < 0 ? 0 : found;
  }

  get visiblePages(): PageGroup {
    return this.#grouping.groups[this.group] ?? NO_PAGES;
  }

  get besidePages(): Readonly<Record<PageMove, PageGroup | null>> {
    const groups = this.#grouping.groups;
    const at = this.group;
    return { decrement: groups[at - 1] ?? null, increment: groups[at + 1] ?? null };
  }

  next(): Promise<void> {
    return this.goToGroup(this.group + 1);
  }

  previous(): Promise<void> {
    return this.goToGroup(this.group - 1);
  }

  async goToGroup(target: number): Promise<void> {
    const book = this.#book();
    if (book === null || target === this.group) return;

    const moved = positionOfGroup(this.#grouping.groups, target);
    if (moved === null) return;

    this.position = moved;
    this.#selection.clear();
    const place = this.#grouping.placeShowing(moved.index);
    this.#places.schedule(book.id, place);
    await this.#places.persist(book.id, place);
  }

  async goToImage(id: BookId, index: ImageIndex): Promise<void> {
    const book = this.#book();
    if (book === null || book.id !== id || book.imageCount === 0) return;

    const wanted = imageIndex(Math.min(Math.max(index, 0), book.imageCount - 1));
    if (wanted === this.position.index) return;

    if (book.layoutKind === 'continuous') {
      this.moveTo(readingPosition(wanted, 0));
      return;
    }

    const group = groupContaining(this.#grouping.groups, wanted);
    if (group >= 0) await this.goToGroup(group);
  }

  moveTo(position: ReadingPosition, shownThrough: ImageIndex = position.index): void {
    const book = this.#book();
    if (book === null) return;

    const held = this.position;
    if (position.index === held.index && position.offset === held.offset) return;

    this.position = position;
    this.#places.schedule(book.id, imagePlace(position.index, shownThrough, position.offset));
  }
}

export { AT_THE_FIRST_IMAGE, PageNavigation };
