import type { CatalogId } from '$lib/shared/ids';
import type { CatalogPasswords } from '../domain/catalog-passwords';

type UnlockCatalogResult = { readonly kind: 'success' };

type UnlockCatalogDeps = { readonly passwords: CatalogPasswords };

function unlockCatalog(
  deps: UnlockCatalogDeps,
  id: CatalogId,
  password: string,
): UnlockCatalogResult {
  deps.passwords.set(id, password);
  return { kind: 'success' };
}

export { unlockCatalog };
export type { UnlockCatalogDeps, UnlockCatalogResult };
