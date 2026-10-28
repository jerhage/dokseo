import type { CatalogId } from '$lib/shared/ids';
import type { CatalogPasswords } from '../domain/catalog-passwords';
import type { RememberedPasswords } from '../domain/remembered-passwords';

type UnlockCatalogResult = { readonly kind: 'success' } | { readonly kind: 'not-remembered' };

type UnlockCatalogDeps = {
  readonly passwords: CatalogPasswords;
  readonly remembered: RememberedPasswords;
};

async function unlockCatalog(
  deps: UnlockCatalogDeps,
  id: CatalogId,
  password: string,
  remember: boolean,
): Promise<UnlockCatalogResult> {
  deps.passwords.set(id, password);
  if (!remember) {
    await deps.remembered.forget(id);
    return { kind: 'success' };
  }
  const remembered = await deps.remembered.remember(id, password);
  if (remembered.kind !== 'success') return { kind: 'not-remembered' };
  return { kind: 'success' };
}

export { unlockCatalog };
export type { UnlockCatalogDeps, UnlockCatalogResult };
