import { rememberedString } from '$lib/platform/storage/remembered-string';
import type { LocateStore } from '$lib/platform/storage/remembered-string';
import { SORT_ORDERS, toShelf } from './library-shelves';
import type { CollectionView, Shelf, SortOrder } from './library-shelves';

const SHELF_KEY = 'reader.library.shelf';

const SORT_KEY = 'reader.library.sort';

const VIEW_KEY = 'reader.library.view';

const COLLECTION_VIEWS: readonly CollectionView[] = ['grid', 'list'];

type LibraryArrangement = {
  readonly shelf: Shelf;
  readonly order: SortOrder;
  readonly layout: CollectionView;
};

function toSortOrder(stored: string | null): SortOrder {
  return SORT_ORDERS.find((order) => order === stored) ?? 'added';
}

function toCollectionView(stored: string | null): CollectionView {
  return COLLECTION_VIEWS.find((view) => view === stored) ?? 'grid';
}

function readArrangement(locate?: LocateStore): LibraryArrangement {
  return {
    shelf: toShelf(rememberedString(SHELF_KEY, locate).read() ?? undefined),
    order: toSortOrder(rememberedString(SORT_KEY, locate).read()),
    layout: toCollectionView(rememberedString(VIEW_KEY, locate).read()),
  };
}

function saveShelf(shelf: Shelf, locate?: LocateStore): void {
  rememberedString(SHELF_KEY, locate).write(shelf);
}

function saveSortOrder(order: SortOrder, locate?: LocateStore): void {
  rememberedString(SORT_KEY, locate).write(order);
}

function saveCollectionView(layout: CollectionView, locate?: LocateStore): void {
  rememberedString(VIEW_KEY, locate).write(layout);
}

export {
  SHELF_KEY,
  SORT_KEY,
  VIEW_KEY,
  readArrangement,
  saveCollectionView,
  saveShelf,
  saveSortOrder,
  toCollectionView,
  toSortOrder,
};
export type { LibraryArrangement };
