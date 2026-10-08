import type { CatalogId } from '$lib/shared/ids';
import type { OriginListing, OriginRepository } from '../domain/origin-repository';

type ListCatalogOriginsResult = OriginListing;

type ListCatalogOriginsDeps = { readonly origins: OriginRepository };

function listCatalogOrigins(
  deps: ListCatalogOriginsDeps,
  catalogId: CatalogId,
): Promise<ListCatalogOriginsResult> {
  return deps.origins.listByCatalog(catalogId);
}

export { listCatalogOrigins };
export type { ListCatalogOriginsDeps, ListCatalogOriginsResult };
