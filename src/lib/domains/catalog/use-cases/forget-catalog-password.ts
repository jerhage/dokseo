import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { CatalogPasswords } from '../domain/catalog-passwords';
import type { RememberedPasswords } from '../domain/remembered-passwords';

type ForgetCatalogPasswordResult = { readonly kind: 'success' } | StorageUnavailable;

type ForgetCatalogPasswordDeps = {
  readonly passwords: CatalogPasswords;
  readonly remembered: RememberedPasswords;
};

async function forgetCatalogPassword(
  deps: ForgetCatalogPasswordDeps,
  id: CatalogId,
): Promise<ForgetCatalogPasswordResult> {
  deps.passwords.forget(id);
  return await deps.remembered.forget(id);
}

export { forgetCatalogPassword };
export type { ForgetCatalogPasswordDeps, ForgetCatalogPasswordResult };
