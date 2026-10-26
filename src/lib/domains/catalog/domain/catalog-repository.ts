import type {
  AcceptedVersion,
  PendingMarkers,
  RecordVersions,
  SettledMarker,
} from '$lib/shared/change-marker';
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

type RemoteCatalogWrite =
  | { readonly kind: 'save-catalog'; readonly catalog: Catalog; readonly accepted: AcceptedVersion }
  | { readonly kind: 'remove-catalog'; readonly id: CatalogId; readonly accepted: AcceptedVersion };

interface CatalogRepository {
  list(): Promise<CatalogListing>;
  get(id: CatalogId): Promise<CatalogLookup>;
  save(catalog: Catalog): Promise<CatalogWrite>;
  remove(id: CatalogId): Promise<CatalogWrite>;
  pendingChanges(): Promise<PendingMarkers>;
  settleChanges(settled: readonly SettledMarker[]): Promise<CatalogWrite>;
  recordVersions(): Promise<RecordVersions>;
  applyRemote(write: RemoteCatalogWrite): Promise<CatalogWrite>;
}

export type { CatalogListing, CatalogLookup, CatalogRepository, CatalogWrite, RemoteCatalogWrite };
