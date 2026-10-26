import type { RecordVersions } from '$lib/shared/change-marker';
import type { CatalogRepository } from '../domain/catalog-repository';

type ReadCatalogVersionsResult = RecordVersions;

type ReadCatalogVersionsDeps = { readonly catalogs: CatalogRepository };

function readCatalogVersions(deps: ReadCatalogVersionsDeps): Promise<ReadCatalogVersionsResult> {
  return deps.catalogs.recordVersions();
}

export { readCatalogVersions };
export type { ReadCatalogVersionsDeps, ReadCatalogVersionsResult };
