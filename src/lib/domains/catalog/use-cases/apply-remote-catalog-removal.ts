import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CatalogRepository } from '../domain/catalog-repository';

type ApplyRemoteCatalogRemovalResult = { readonly kind: 'success' } | StorageUnavailable;

type ApplyRemoteCatalogRemovalDeps = { readonly catalogs: CatalogRepository };

function applyRemoteCatalogRemoval(
  deps: ApplyRemoteCatalogRemovalDeps,
  id: CatalogId,
  accepted: AcceptedVersion,
): Promise<ApplyRemoteCatalogRemovalResult> {
  return deps.catalogs.applyRemote({ kind: 'remove-catalog', id, accepted });
}

export { applyRemoteCatalogRemoval };
export type { ApplyRemoteCatalogRemovalDeps, ApplyRemoteCatalogRemovalResult };
