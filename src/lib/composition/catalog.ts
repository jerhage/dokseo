import { newCatalogId } from '$lib/shared/ids';
import type { CatalogId } from '$lib/shared/ids';
import { createCatalogOriginsRepository } from '../domains/catalog/adapters/indexeddb-catalog-origins.repo';
import type { BookOrigin } from '../domains/catalog/domain/book-origin';
import type { CatalogDraft } from '../domains/catalog/domain/catalog-draft';
import { addCatalog } from '../domains/catalog/use-cases/add-catalog';
import type { AddCatalogResult } from '../domains/catalog/use-cases/add-catalog';
import { editCatalog } from '../domains/catalog/use-cases/edit-catalog';
import type { EditCatalogResult } from '../domains/catalog/use-cases/edit-catalog';
import { findOrigin } from '../domains/catalog/use-cases/find-origin';
import type { FindOriginResult } from '../domains/catalog/use-cases/find-origin';
import { listCatalogOrigins } from '../domains/catalog/use-cases/list-catalog-origins';
import type { ListCatalogOriginsResult } from '../domains/catalog/use-cases/list-catalog-origins';
import { listCatalogs } from '../domains/catalog/use-cases/list-catalogs';
import type { ListCatalogsResult } from '../domains/catalog/use-cases/list-catalogs';
import { recordOrigin } from '../domains/catalog/use-cases/record-origin';
import type { RecordOriginResult } from '../domains/catalog/use-cases/record-origin';
import { removeCatalog } from '../domains/catalog/use-cases/remove-catalog';
import type { RemoveCatalogResult } from '../domains/catalog/use-cases/remove-catalog';

type CatalogUseCases = {
  readonly addCatalog: (draft: CatalogDraft) => Promise<AddCatalogResult>;
  readonly editCatalog: (id: CatalogId, draft: CatalogDraft) => Promise<EditCatalogResult>;
  readonly removeCatalog: (id: CatalogId) => Promise<RemoveCatalogResult>;
  readonly listCatalogs: () => Promise<ListCatalogsResult>;
  readonly recordOrigin: (origin: BookOrigin) => Promise<RecordOriginResult>;
  readonly listCatalogOrigins: (id: CatalogId) => Promise<ListCatalogOriginsResult>;
  readonly findOrigin: (id: CatalogId, entryId: string) => Promise<FindOriginResult>;
};

function buildCatalog(): CatalogUseCases {
  const repository = createCatalogOriginsRepository();
  const catalogs = repository;
  const origins = repository;

  return {
    addCatalog: (draft: CatalogDraft) => addCatalog({ catalogs, newId: newCatalogId }, draft),
    editCatalog: (id: CatalogId, draft: CatalogDraft) => editCatalog({ catalogs }, id, draft),
    removeCatalog: (id: CatalogId) => removeCatalog({ catalogs, origins }, id),
    listCatalogs: () => listCatalogs({ catalogs }),
    recordOrigin: (origin: BookOrigin) => recordOrigin({ origins }, origin),
    listCatalogOrigins: (id: CatalogId) => listCatalogOrigins({ origins }, id),
    findOrigin: (id: CatalogId, entryId: string) => findOrigin({ origins }, id, entryId),
  };
}

export { buildCatalog };
export type { CatalogUseCases };
