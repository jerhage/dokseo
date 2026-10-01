import type { Container } from '$lib/container';
import type { Size } from '$lib/shared/geometry';
import type { ImageIndex } from '$lib/shared/ids';
import { effectivePairing, imageLayoutKind } from '$lib/shared/layout-kind';
import type { PageSource } from '$lib/shared/page-source';
import { imagePlace } from '$lib/shared/reading-place';
import type { ImagePlace } from '$lib/shared/reading-place';
import { groupContaining, pairPages } from '../domain/page-pairing';
import type { PageGroup } from '../domain/page-pairing';
import type { ReaderBook } from './reader-opening';

type Regrouped = (book: ReaderBook) => void;

const NO_PAGES: PageGroup = [];

const NO_GROUPS: readonly PageGroup[] = [];

function unmeasured(count: number): readonly (Size | null)[] {
  return Array.from({ length: Math.max(count, 0) }, () => null);
}

class PageGrouping {
  sizes = $state.raw<readonly (Size | null)[]>([]);
  groups = $state.raw<readonly PageGroup[]>([]);

  #container: Container;
  #book: () => ReaderBook | null;
  #generation: () => number;
  #regrouped: Regrouped;

  constructor(
    container: Container,
    book: () => ReaderBook | null,
    generation: () => number,
    regrouped: Regrouped,
  ) {
    this.#container = container;
    this.#book = book;
    this.#generation = generation;
    this.#regrouped = regrouped;
  }

  measure(index: ImageIndex, size: Size): void {
    const book = this.#book();
    if (book === null || index < 0 || index >= this.sizes.length) return;

    const known = this.sizes[index] ?? null;
    if (known !== null && known.width === size.width && known.height === size.height) return;

    const sizes = [...this.sizes];
    sizes[index] = size;
    this.regroup(book, sizes);
  }

  start(book: ReaderBook): void {
    this.regroup(book, unmeasured(book.imageCount));
  }

  async seed(source: PageSource, generation: number): Promise<void> {
    let read: Awaited<ReturnType<PageSource['sizes']>>;
    try {
      read = await this.#container.library.readPageSizes(source);
    } catch {
      return;
    }

    const book = this.#book();
    if (generation !== this.#generation() || book === null || read.kind !== 'success') return;

    const found = read.sizes;
    const sizes = this.sizes.map((known, index) => known ?? found[index] ?? null);
    if (sizes.every((size, index) => size === this.sizes[index])) return;
    this.regroup(book, sizes);
  }

  regroup(book: ReaderBook, sizes: readonly (Size | null)[]): void {
    this.sizes = sizes;
    const layout = imageLayoutKind(book.layoutKind);
    this.groups =
      layout === null ? NO_GROUPS : pairPages(sizes, effectivePairing(book.pagePairing, layout));
    this.#regrouped(book);
  }

  reset(): void {
    this.sizes = [];
    this.groups = [];
  }

  groupHolding(index: ImageIndex): PageGroup {
    return this.groups[groupContaining(this.groups, index)] ?? NO_PAGES;
  }

  placeShowing(index: ImageIndex): ImagePlace {
    return imagePlace(index, this.groupHolding(index).at(-1) ?? index);
  }
}

export { NO_PAGES, PageGrouping };
export type { Regrouped };
