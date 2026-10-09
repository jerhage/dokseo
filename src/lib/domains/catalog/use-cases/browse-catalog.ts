import type { CatalogId } from '$lib/shared/ids';
import type { FeedAddress, FeedPage, TrailStep } from '../domain/catalog-feed';
import type { ClientFailure } from '../domain/catalog-source';
import { catalogAccess } from './catalog-access';
import type { CatalogAccessDeps, CatalogAccessFailure } from './catalog-access';

type BrowseCatalogResult =
  | { readonly kind: 'success'; readonly page: FeedPage }
  | { readonly kind: 'not-a-catalog' }
  | ClientFailure
  | CatalogAccessFailure;

type BrowseCatalogDeps = CatalogAccessDeps;

async function browseCatalog(
  deps: BrowseCatalogDeps,
  catalogId: CatalogId,
  address: FeedAddress | null,
  path: readonly TrailStep[],
  signal?: AbortSignal,
): Promise<BrowseCatalogResult> {
  const access = await catalogAccess(deps, catalogId);
  if (access.kind !== 'success') return access;

  const target = address ?? access.source.rootAddress(access.catalog.rootUrl);
  return access.source.readFeed(target, { catalogId, path }, access.credentials, signal);
}

export { browseCatalog };
export type { BrowseCatalogDeps, BrowseCatalogResult };
