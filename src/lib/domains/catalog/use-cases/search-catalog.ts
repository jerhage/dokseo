import type { CatalogId } from '$lib/shared/ids';
import type { FeedSearch } from '../domain/catalog-feed';
import type { FeedPath } from '../domain/remote-publication';
import { heldReading } from './browse-catalog';
import type { BrowseCatalogDeps, BrowseCatalogResult } from './browse-catalog';
import { catalogAccess } from './catalog-access';

type SearchCatalogResult = BrowseCatalogResult;

async function searchCatalog(
  deps: BrowseCatalogDeps,
  catalogId: CatalogId,
  search: FeedSearch,
  query: string,
  path: FeedPath,
  signal?: AbortSignal,
): Promise<SearchCatalogResult> {
  const access = await catalogAccess(deps, catalogId);
  if (access.kind !== 'success') return access;

  const fetched = await access.source.search(
    search,
    query,
    { catalogId, path },
    access.credentials,
    signal,
  );
  if (fetched.kind !== 'success') return fetched;

  return heldReading(deps, catalogId, fetched.reading);
}

export { searchCatalog };
export type { SearchCatalogResult };
