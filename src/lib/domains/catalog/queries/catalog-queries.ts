import { mutationOptions, queryOptions } from '@tanstack/svelte-query';
import type { CatalogId } from '$lib/shared/ids';
import type { CatalogDraft } from '../domain/catalog-draft';
import type { AddCatalogResult } from '../use-cases/add-catalog';
import type { EditCatalogResult } from '../use-cases/edit-catalog';
import type { ForgetCatalogPasswordResult } from '../use-cases/forget-catalog-password';
import type { ListCatalogsResult } from '../use-cases/list-catalogs';
import type { ListOriginsResult } from '../use-cases/list-origins';
import type { ListRememberedPasswordsResult } from '../use-cases/list-remembered-passwords';
import type { RemoveCatalogResult } from '../use-cases/remove-catalog';
import type { TestCatalogConnectionResult } from '../use-cases/test-catalog-connection';
import type { UnlockCatalogResult } from '../use-cases/unlock-catalog';
import { catalogKeys } from './catalog-keys';

type CatalogReads = {
  readonly listCatalogs: () => Promise<ListCatalogsResult>;
  readonly listOrigins: () => Promise<ListOriginsResult>;
  readonly listRememberedPasswords: () => Promise<ListRememberedPasswordsResult>;
};

type CatalogWrites = {
  readonly addCatalog: (draft: CatalogDraft) => Promise<AddCatalogResult>;
  readonly editCatalog: (id: CatalogId, draft: CatalogDraft) => Promise<EditCatalogResult>;
  readonly removeCatalog: (id: CatalogId) => Promise<RemoveCatalogResult>;
  readonly unlockCatalog: (
    id: CatalogId,
    password: string,
    remember: boolean,
  ) => Promise<UnlockCatalogResult>;
  readonly forgetCatalogPassword: (id: CatalogId) => Promise<ForgetCatalogPasswordResult>;
  readonly testCatalogConnection: (
    draft: CatalogDraft,
    password: string | null,
  ) => Promise<TestCatalogConnectionResult>;
};

type CatalogEdit = { readonly id: CatalogId; readonly draft: CatalogDraft };

type UnlockRequest = {
  readonly id: CatalogId;
  readonly password: string;
  readonly remember: boolean;
};

type ConnectionRequest = { readonly draft: CatalogDraft; readonly password: string | null };

function catalogsQuery(catalog: Pick<CatalogReads, 'listCatalogs'>) {
  return queryOptions({
    queryKey: catalogKeys.catalogs(),
    queryFn: () => catalog.listCatalogs(),
    staleTime: 0,
  });
}

function originsQuery(catalog: Pick<CatalogReads, 'listOrigins'>) {
  return queryOptions({
    queryKey: catalogKeys.origins(),
    queryFn: () => catalog.listOrigins(),
    staleTime: 0,
  });
}

function rememberedPasswordsQuery(catalog: Pick<CatalogReads, 'listRememberedPasswords'>) {
  return queryOptions({
    queryKey: catalogKeys.rememberedPasswords(),
    queryFn: () => catalog.listRememberedPasswords(),
    staleTime: 0,
  });
}

function addCatalogMutation(catalog: Pick<CatalogWrites, 'addCatalog'>) {
  return mutationOptions({
    mutationFn: (draft: CatalogDraft) => catalog.addCatalog(draft),
  });
}

function editCatalogMutation(catalog: Pick<CatalogWrites, 'editCatalog'>) {
  return mutationOptions({
    mutationFn: ({ id, draft }: CatalogEdit) => catalog.editCatalog(id, draft),
  });
}

function removeCatalogMutation(catalog: Pick<CatalogWrites, 'removeCatalog'>) {
  return mutationOptions({
    mutationFn: (id: CatalogId) => catalog.removeCatalog(id),
  });
}

function unlockCatalogMutation(catalog: Pick<CatalogWrites, 'unlockCatalog'>) {
  return mutationOptions({
    mutationFn: ({ id, password, remember }: UnlockRequest) =>
      catalog.unlockCatalog(id, password, remember),
  });
}

function forgetCatalogPasswordMutation(catalog: Pick<CatalogWrites, 'forgetCatalogPassword'>) {
  return mutationOptions({
    mutationFn: (id: CatalogId) => catalog.forgetCatalogPassword(id),
  });
}

function testConnectionMutation(catalog: Pick<CatalogWrites, 'testCatalogConnection'>) {
  return mutationOptions({
    mutationFn: ({ draft, password }: ConnectionRequest) =>
      catalog.testCatalogConnection(draft, password),
  });
}

export {
  addCatalogMutation,
  catalogsQuery,
  editCatalogMutation,
  forgetCatalogPasswordMutation,
  originsQuery,
  rememberedPasswordsQuery,
  removeCatalogMutation,
  testConnectionMutation,
  unlockCatalogMutation,
};
export type { CatalogEdit, CatalogReads, CatalogWrites, ConnectionRequest, UnlockRequest };
