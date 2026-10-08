import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Catalog } from './catalog';
import type { UnreadableCatalog } from './stored-catalog';

type CatalogListing =
  | {
      readonly kind: 'success';
      readonly catalogs: readonly Catalog[];
      readonly unreadable: readonly UnreadableCatalog[];
    }
  | StorageUnavailable;

type CatalogLookup =
  | { readonly kind: 'success'; readonly catalog: Catalog | null }
  | { readonly kind: 'unreadable'; readonly id: CatalogId }
  | StorageUnavailable;

type CatalogWrite = { readonly kind: 'success' } | StorageUnavailable;

interface CatalogRepository {
  list(): Promise<CatalogListing>;
  get(id: CatalogId): Promise<CatalogLookup>;
  save(catalog: Catalog): Promise<CatalogWrite>;
  remove(id: CatalogId): Promise<CatalogWrite>;
}

export type { CatalogListing, CatalogLookup, CatalogRepository, CatalogWrite };
