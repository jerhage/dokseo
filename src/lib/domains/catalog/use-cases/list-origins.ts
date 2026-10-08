import type { OriginListing, OriginRepository } from '../domain/origin-repository';

type ListOriginsResult = OriginListing;

type ListOriginsDeps = { readonly origins: OriginRepository };

function listOrigins(deps: ListOriginsDeps): Promise<ListOriginsResult> {
  return deps.origins.listAll();
}

export { listOrigins };
export type { ListOriginsDeps, ListOriginsResult };
