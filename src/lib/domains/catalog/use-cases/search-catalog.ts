import type { CatalogId } from '$lib/shared/ids';
import type { FeedSearch, TrailStep } from '../domain/catalog-feed';
import type { BrowseCatalogDeps, BrowseCatalogResult } from './browse-catalog';
import { catalogAccess } from './catalog-access';

type SearchCatalogResult = BrowseCatalogResult;

async function searchCatalog(
  deps: BrowseCatalogDeps,
  catalogId: CatalogId,
  search: FeedSearch,
  query: string,
  path: readonly TrailStep[],
  signal?: AbortSignal,
): Promise<SearchCatalogResult> {
  const access = await catalogAccess(deps, catalogId);
  if (access.kind !== 'success') return access;

  return access.source.search(search, query, { catalogId, path }, access.credentials, signal);
}

export { searchCatalog };
export type { SearchCatalogResult };
