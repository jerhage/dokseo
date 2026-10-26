import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Catalog } from '../domain/catalog';
import type { CatalogRepository } from '../domain/catalog-repository';

type ApplyRemoteCatalogResult = { readonly kind: 'success' } | StorageUnavailable;

type ApplyRemoteCatalogDeps = { readonly catalogs: CatalogRepository };

function applyRemoteCatalog(
  deps: ApplyRemoteCatalogDeps,
  catalog: Catalog,
  accepted: AcceptedVersion,
): Promise<ApplyRemoteCatalogResult> {
  return deps.catalogs.applyRemote({ kind: 'save-catalog', catalog, accepted });
}

export { applyRemoteCatalog };
export type { ApplyRemoteCatalogDeps, ApplyRemoteCatalogResult };
