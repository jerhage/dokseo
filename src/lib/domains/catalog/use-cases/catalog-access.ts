import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Catalog } from '../domain/catalog';
import type { CatalogPasswords } from '../domain/catalog-passwords';
import type { CatalogRepository } from '../domain/catalog-repository';
import type { RememberedPasswords } from '../domain/remembered-passwords';
import type { CatalogCredentials, CatalogSource, CatalogSourceFor } from '../domain/catalog-source';

type CatalogAccessFailure =
  | { readonly kind: 'unknown-catalog'; readonly id: CatalogId }
  | { readonly kind: 'unreadable-catalog'; readonly id: CatalogId }
  | { readonly kind: 'locked'; readonly id: CatalogId }
  | StorageUnavailable;

type CatalogAccess =
  | {
      readonly kind: 'success';
      readonly catalog: Catalog;
      readonly credentials: CatalogCredentials;
      readonly source: CatalogSource;
    }
  | CatalogAccessFailure;

type CatalogAccessDeps = {
  readonly catalogs: CatalogRepository;
  readonly passwords: CatalogPasswords;
  readonly remembered: RememberedPasswords;
  readonly sourceFor: CatalogSourceFor;
};

async function heldPassword(deps: CatalogAccessDeps, id: CatalogId): Promise<string | null> {
  const session = deps.passwords.get(id);
  if (session !== null) return session;
  const remembered = await deps.remembered.read(id);
  if (remembered.kind === 'unreadable') {
    await deps.remembered.forget(id);
    return null;
  }
  if (remembered.kind !== 'success' || remembered.password === null) return null;
  deps.passwords.set(id, remembered.password);
  return remembered.password;
}

async function catalogAccess(deps: CatalogAccessDeps, id: CatalogId): Promise<CatalogAccess> {
  const found = await deps.catalogs.get(id);
  if (found.kind === 'unreadable') return { kind: 'unreadable-catalog', id };
  if (found.kind !== 'success') return found;
  const catalog = found.catalog;
  if (catalog === null) return { kind: 'unknown-catalog', id };
  if (catalog.auth.kind === 'none') {
    const source = await deps.sourceFor(catalog.protocol);
    return { kind: 'success', catalog, credentials: catalog.auth, source };
  }

  const password = await heldPassword(deps, id);
  if (password === null) return { kind: 'locked', id };
  const credentials: CatalogCredentials = {
    kind: 'basic',
    username: catalog.auth.username,
    password,
  };
  const source = await deps.sourceFor(catalog.protocol);
  return { kind: 'success', catalog, credentials, source };
}

export { catalogAccess };
export type { CatalogAccess, CatalogAccessDeps, CatalogAccessFailure };
