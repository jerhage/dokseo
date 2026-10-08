import type { CatalogId } from '$lib/shared/ids';
import type { OriginLookup, OriginRepository } from '../domain/origin-repository';

type FindOriginResult = OriginLookup;

type FindOriginDeps = { readonly origins: OriginRepository };

function findOrigin(
  deps: FindOriginDeps,
  catalogId: CatalogId,
  entryId: string,
): Promise<FindOriginResult> {
  return deps.origins.find(catalogId, entryId);
}

export { findOrigin };
export type { FindOriginDeps, FindOriginResult };
