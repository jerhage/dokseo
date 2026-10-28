import type { AcceptedVersion } from '$lib/shared/change-marker';
import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CatalogRepository } from '../domain/catalog-repository';
import type { ForgetCatalogPasswordResult } from './forget-catalog-password';

type ApplyRemoteCatalogRemovalResult = { readonly kind: 'success' } | StorageUnavailable;

type ApplyRemoteCatalogRemovalDeps = {
  readonly catalogs: CatalogRepository;
  readonly forgetPassword: (id: CatalogId) => Promise<ForgetCatalogPasswordResult>;
};

async function applyRemoteCatalogRemoval(
  deps: ApplyRemoteCatalogRemovalDeps,
  id: CatalogId,
  accepted: AcceptedVersion,
): Promise<ApplyRemoteCatalogRemovalResult> {
  const applied = await deps.catalogs.applyRemote({ kind: 'remove-catalog', id, accepted });
  if (applied.kind !== 'success') return applied;
  return await deps.forgetPassword(id);
}

export { applyRemoteCatalogRemoval };
export type { ApplyRemoteCatalogRemovalDeps, ApplyRemoteCatalogRemovalResult };
