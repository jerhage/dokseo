import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CatalogPasswords } from '../domain/catalog-passwords';
import type { CatalogRepository } from '../domain/catalog-repository';
import type { OriginRepository } from '../domain/origin-repository';

type RemoveCatalogResult =
  | { readonly kind: 'success' }
  | { readonly kind: 'not-found'; readonly id: CatalogId }
  | StorageUnavailable;

type RemoveCatalogDeps = {
  readonly catalogs: CatalogRepository;
  readonly origins: OriginRepository;
  readonly passwords: CatalogPasswords;
};

async function removeCatalog(deps: RemoveCatalogDeps, id: CatalogId): Promise<RemoveCatalogResult> {
  const found = await deps.catalogs.get(id);
  if (found.kind === 'storage-unavailable') return found;
  if (found.kind === 'success' && found.catalog === null) return { kind: 'not-found', id };

  const cleared = await deps.origins.deleteByCatalog(id);
  if (cleared.kind !== 'success') return cleared;

  const removed = await deps.catalogs.remove(id);
  if (removed.kind !== 'success') return removed;

  deps.passwords.forget(id);
  return { kind: 'success' };
}

export { removeCatalog };
export type { RemoveCatalogDeps, RemoveCatalogResult };
