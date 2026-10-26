import type { PendingMarkers } from '$lib/shared/change-marker';
import type { CatalogRepository } from '../domain/catalog-repository';

type ReadPendingCatalogChangesResult = PendingMarkers;

type ReadPendingCatalogChangesDeps = { readonly catalogs: CatalogRepository };

function readPendingCatalogChanges(
  deps: ReadPendingCatalogChangesDeps,
): Promise<ReadPendingCatalogChangesResult> {
  return deps.catalogs.pendingChanges();
}

export { readPendingCatalogChanges };
export type { ReadPendingCatalogChangesDeps, ReadPendingCatalogChangesResult };
