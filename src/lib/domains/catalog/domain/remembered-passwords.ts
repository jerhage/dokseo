import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type RememberedPasswordRead =
  | { readonly kind: 'success'; readonly password: string | null }
  | { readonly kind: 'unreadable'; readonly id: CatalogId }
  | StorageUnavailable;

type RememberedPasswordWrite = { readonly kind: 'success' } | StorageUnavailable;

type RememberedPasswordListing =
  | { readonly kind: 'success'; readonly ids: ReadonlySet<CatalogId> }
  | StorageUnavailable;

interface RememberedPasswords {
  read(id: CatalogId): Promise<RememberedPasswordRead>;
  remember(id: CatalogId, password: string): Promise<RememberedPasswordWrite>;
  forget(id: CatalogId): Promise<RememberedPasswordWrite>;
  list(): Promise<RememberedPasswordListing>;
}

export type {
  RememberedPasswordListing,
  RememberedPasswordRead,
  RememberedPasswordWrite,
  RememberedPasswords,
};
