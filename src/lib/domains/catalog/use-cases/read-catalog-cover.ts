import type { CatalogId } from '$lib/shared/ids';
import type { ClientFailure } from '../domain/catalog-source';
import { catalogAccess } from './catalog-access';
import type { CatalogAccessDeps, CatalogAccessFailure } from './catalog-access';

type ReadCatalogCoverResult =
  | { readonly kind: 'success'; readonly image: Blob }
  | ClientFailure
  | CatalogAccessFailure;

type ReadCatalogCoverDeps = CatalogAccessDeps;

async function readCatalogCover(
  deps: ReadCatalogCoverDeps,
  catalogId: CatalogId,
  url: string,
  signal?: AbortSignal,
): Promise<ReadCatalogCoverResult> {
  const access = await catalogAccess(deps, catalogId);
  if (access.kind !== 'success') return access;
  return access.source.readImage(url, access.credentials, signal);
}

export { readCatalogCover };
export type { ReadCatalogCoverDeps, ReadCatalogCoverResult };
