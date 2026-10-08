import type { CatalogListing, CatalogRepository } from '../domain/catalog-repository';

type ListCatalogsResult = CatalogListing;

type ListCatalogsDeps = { readonly catalogs: CatalogRepository };

function listCatalogs(deps: ListCatalogsDeps): Promise<ListCatalogsResult> {
  return deps.catalogs.list();
}

export { listCatalogs };
export type { ListCatalogsDeps, ListCatalogsResult };
