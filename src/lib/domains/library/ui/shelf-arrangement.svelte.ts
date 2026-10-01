import type { LocateStore } from '$lib/platform/storage/remembered-string';
import { RememberedChoice } from '$lib/shared/remembered-choice.svelte';
import type { Book } from '../domain/book/book';
import {
  readArrangement,
  saveCollectionView,
  saveShelf,
  saveSortOrder,
} from './library-arrangement';
import { shelfBooks, sortBooks } from './library-shelves';
import type { CollectionView, Shelf, SortOrder } from './library-shelves';

class ShelfArrangement {
  readonly shelf: RememberedChoice<Shelf>;
  readonly order: RememberedChoice<SortOrder>;
  readonly layout: RememberedChoice<CollectionView>;

  constructor(locate?: LocateStore) {
    const stored = readArrangement(locate);
    this.shelf = new RememberedChoice(
      () => stored.shelf,
      (shelf) => saveShelf(shelf, locate),
    );
    this.order = new RememberedChoice(
      () => stored.order,
      (order) => saveSortOrder(order, locate),
    );
    this.layout = new RememberedChoice(
      () => stored.layout,
      (layout) => saveCollectionView(layout, locate),
    );
  }

  arrange(books: readonly Book[]): readonly Book[] {
    return sortBooks(shelfBooks(books, this.shelf.value), this.order.value);
  }
}

export { ShelfArrangement };
