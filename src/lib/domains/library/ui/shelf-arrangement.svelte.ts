import type { LocateStore } from '$lib/platform/storage/remembered-string';
import { RememberedChoice } from '$lib/shared/remembered-choice.svelte';
import {
  readArrangement,
  saveCollectionView,
  saveShelf,
  saveSortOrder,
} from './library-arrangement';
import type { CollectionView, Shelf, SortOrder } from './library-shelves';

function createShelfArrangement(locate?: LocateStore) {
  const stored = readArrangement(locate);
  const shelf = new RememberedChoice<Shelf>(
    () => stored.shelf,
    (next) => saveShelf(next, locate),
  );
  const order = new RememberedChoice<SortOrder>(
    () => stored.order,
    (next) => saveSortOrder(next, locate),
  );
  const layout = new RememberedChoice<CollectionView>(
    () => stored.layout,
    (next) => saveCollectionView(next, locate),
  );

  return {
    get shelf(): Shelf {
      return shelf.value;
    },
    get order(): SortOrder {
      return order.value;
    },
    get layout(): CollectionView {
      return layout.value;
    },
    chooseShelf(next: Shelf): void {
      shelf.choose(next);
    },
    chooseOrder(next: SortOrder): void {
      order.choose(next);
    },
    chooseLayout(next: CollectionView): void {
      layout.choose(next);
    },
  };
}

export { createShelfArrangement };
