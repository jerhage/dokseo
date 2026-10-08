import type { CatalogId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Catalog } from '../domain/catalog';
import type { CatalogPasswords } from '../domain/catalog-passwords';
import type { CatalogRepository } from '../domain/catalog-repository';
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
  readonly sourceFor: CatalogSourceFor;
};

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

  const password = deps.passwords.get(id);
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
