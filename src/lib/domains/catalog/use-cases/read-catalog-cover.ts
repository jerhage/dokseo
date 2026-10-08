import type { CatalogId } from '$lib/shared/ids';
import type { ClientFailure, OpdsClient } from '../domain/opds-client';
import { catalogAccess } from './catalog-access';
import type { CatalogAccessDeps, CatalogAccessFailure } from './catalog-access';

type ReadCatalogCoverResult =
  | { readonly kind: 'success'; readonly image: Blob }
  | ClientFailure
  | CatalogAccessFailure;

type ReadCatalogCoverDeps = CatalogAccessDeps & { readonly client: OpdsClient };

async function readCatalogCover(
  deps: ReadCatalogCoverDeps,
  catalogId: CatalogId,
  url: string,
  signal?: AbortSignal,
): Promise<ReadCatalogCoverResult> {
  const access = await catalogAccess(deps, catalogId);
  if (access.kind !== 'success') return access;
  return deps.client.readImage(url, access.credentials, signal);
}

export { readCatalogCover };
export type { ReadCatalogCoverDeps, ReadCatalogCoverResult };
