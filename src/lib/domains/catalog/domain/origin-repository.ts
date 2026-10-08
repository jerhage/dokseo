import type { BookId, CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { BookOrigin } from './book-origin';
import type { UnreadableOrigin } from './stored-origin';

type OriginListing =
  | {
      readonly kind: 'success';
      readonly origins: readonly BookOrigin[];
      readonly unreadable: readonly UnreadableOrigin[];
    }
  | StorageUnavailable;

type OriginLookup =
  | { readonly kind: 'success'; readonly origin: BookOrigin | null }
  | { readonly kind: 'unreadable'; readonly bookId: BookId }
  | StorageUnavailable;

type OriginWrite = { readonly kind: 'success' } | StorageUnavailable;

interface OriginRepository {
  put(origin: BookOrigin): Promise<OriginWrite>;
  listAll(): Promise<OriginListing>;
  listByCatalog(catalogId: CatalogId): Promise<OriginListing>;
  find(catalogId: CatalogId, entryId: string): Promise<OriginLookup>;
  deleteByBook(bookId: BookId): Promise<OriginWrite>;
  deleteByCatalog(catalogId: CatalogId): Promise<OriginWrite>;
}

export type { OriginListing, OriginLookup, OriginRepository, OriginWrite };
