import { newCatalogId } from '$lib/shared/ids';
import type { CatalogId } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import { SessionCatalogPasswords } from '../domains/catalog/adapters/session-catalog-passwords';
import { createCatalogOriginsRepository } from '../domains/catalog/adapters/indexeddb-catalog-origins.repo';
import { catalogSourceFor } from './catalog-sources';
import type { BookOrigin } from '../domains/catalog/domain/book-origin';
import type { FeedSearch } from '../domains/catalog/domain/catalog-feed';
import type { CatalogDraft } from '../domains/catalog/domain/catalog-draft';
import type { BookMatching } from '../domains/library/domain/book/book-matching';
import type { ReadingDefaults } from '../domains/library/domain/book/reading-defaults';
import type { DownloadProgress } from '../domains/catalog/domain/catalog-source';
import type { FeedPath, RemotePublication } from '../domains/catalog/domain/remote-publication';
import { addCatalog } from '../domains/catalog/use-cases/add-catalog';
import type { AddCatalogResult } from '../domains/catalog/use-cases/add-catalog';
import { browseCatalog } from '../domains/catalog/use-cases/browse-catalog';
import type { BrowseCatalogResult, ReadBook } from '../domains/catalog/use-cases/browse-catalog';
import { downloadPublication } from '../domains/catalog/use-cases/download-publication';
import { updatePublication } from '../domains/catalog/use-cases/update-publication';
import type {
  ReplaceFile,
  UpdatePublicationResult,
} from '../domains/catalog/use-cases/update-publication';
import type {
  DownloadPublicationResult,
  OpenFile,
} from '../domains/catalog/use-cases/download-publication';
import { editCatalog } from '../domains/catalog/use-cases/edit-catalog';
import type { EditCatalogResult } from '../domains/catalog/use-cases/edit-catalog';
import { findOrigin } from '../domains/catalog/use-cases/find-origin';
import type { FindOriginResult } from '../domains/catalog/use-cases/find-origin';
import { forgetOrigin } from '../domains/catalog/use-cases/forget-origin';
import type { ForgetOriginResult } from '../domains/catalog/use-cases/forget-origin';
import { listCatalogOrigins } from '../domains/catalog/use-cases/list-catalog-origins';
import type { ListCatalogOriginsResult } from '../domains/catalog/use-cases/list-catalog-origins';
import { listOrigins } from '../domains/catalog/use-cases/list-origins';
import type { ListOriginsResult } from '../domains/catalog/use-cases/list-origins';
import { listCatalogs } from '../domains/catalog/use-cases/list-catalogs';
import type { ListCatalogsResult } from '../domains/catalog/use-cases/list-catalogs';
import { readCatalogCover } from '../domains/catalog/use-cases/read-catalog-cover';
import type { ReadCatalogCoverResult } from '../domains/catalog/use-cases/read-catalog-cover';
import { recordOrigin } from '../domains/catalog/use-cases/record-origin';
import type { RecordOriginResult } from '../domains/catalog/use-cases/record-origin';
import { removeCatalog } from '../domains/catalog/use-cases/remove-catalog';
import type { RemoveCatalogResult } from '../domains/catalog/use-cases/remove-catalog';
import { testCatalogConnection } from '../domains/catalog/use-cases/test-catalog-connection';
import type { TestCatalogConnectionResult } from '../domains/catalog/use-cases/test-catalog-connection';
import { searchCatalog } from '../domains/catalog/use-cases/search-catalog';
import type { SearchCatalogResult } from '../domains/catalog/use-cases/search-catalog';
import { unlockCatalog } from '../domains/catalog/use-cases/unlock-catalog';
import type { UnlockCatalogResult } from '../domains/catalog/use-cases/unlock-catalog';

type CatalogUseCases = {
  readonly addCatalog: (draft: CatalogDraft) => Promise<AddCatalogResult>;
  readonly editCatalog: (id: CatalogId, draft: CatalogDraft) => Promise<EditCatalogResult>;
  readonly removeCatalog: (id: CatalogId) => Promise<RemoveCatalogResult>;
  readonly listCatalogs: () => Promise<ListCatalogsResult>;
  readonly recordOrigin: (origin: BookOrigin) => Promise<RecordOriginResult>;
  readonly listCatalogOrigins: (id: CatalogId) => Promise<ListCatalogOriginsResult>;
  readonly listOrigins: () => Promise<ListOriginsResult>;
  readonly findOrigin: (id: CatalogId, entryId: string) => Promise<FindOriginResult>;
  readonly testCatalogConnection: (
    draft: CatalogDraft,
    password: string | null,
    signal?: AbortSignal,
  ) => Promise<TestCatalogConnectionResult>;
  readonly unlockCatalog: (id: CatalogId, password: string) => UnlockCatalogResult;
  readonly browseCatalog: (
    id: CatalogId,
    url: string | null,
    path: FeedPath,
    signal?: AbortSignal,
  ) => Promise<BrowseCatalogResult>;
  readonly searchCatalog: (
    id: CatalogId,
    search: FeedSearch,
    query: string,
    path: FeedPath,
    signal?: AbortSignal,
  ) => Promise<SearchCatalogResult>;
  readonly readCatalogCover: (
    id: CatalogId,
    url: string,
    signal?: AbortSignal,
  ) => Promise<ReadCatalogCoverResult>;
  readonly downloadPublication: (
    publication: RemotePublication,
    feedPosition: number,
    matching: BookMatching,
    defaults: ReadingDefaults,
    onProgress: DownloadProgress,
    signal?: AbortSignal,
  ) => Promise<DownloadPublicationResult>;
  readonly updatePublication: (
    publication: RemotePublication,
    bookId: BookId,
    feedPosition: number,
    onProgress: DownloadProgress,
    signal?: AbortSignal,
  ) => Promise<UpdatePublicationResult>;
  readonly forgetOrigin: (bookId: BookId) => Promise<ForgetOriginResult>;
};

type CatalogLibrary = {
  readonly openFile: OpenFile;
  readonly replaceBookFile: ReplaceFile;
  readonly readBook: ReadBook;
};

function buildCatalog(library: CatalogLibrary): CatalogUseCases {
  const repository = createCatalogOriginsRepository();
  const catalogs = repository;
  const origins = repository;
  const passwords = new SessionCatalogPasswords();
  const sourceFor = catalogSourceFor;
  const access = { catalogs, passwords, sourceFor };

  return {
    addCatalog: (draft: CatalogDraft) => addCatalog({ catalogs, newId: newCatalogId }, draft),
    editCatalog: (id: CatalogId, draft: CatalogDraft) => editCatalog({ catalogs }, id, draft),
    removeCatalog: (id: CatalogId) => removeCatalog({ catalogs, origins, passwords }, id),
    listCatalogs: () => listCatalogs({ catalogs }),
    recordOrigin: (origin: BookOrigin) => recordOrigin({ origins }, origin),
    listCatalogOrigins: (id: CatalogId) => listCatalogOrigins({ origins }, id),
    listOrigins: () => listOrigins({ origins }),
    findOrigin: (id: CatalogId, entryId: string) => findOrigin({ origins }, id, entryId),
    testCatalogConnection: (draft, password, signal) =>
      testCatalogConnection({ sourceFor }, draft, password, signal),
    unlockCatalog: (id: CatalogId, password: string) => unlockCatalog({ passwords }, id, password),
    browseCatalog: (id, url, path, signal) =>
      browseCatalog({ ...access, origins, readBook: library.readBook }, id, url, path, signal),
    searchCatalog: (id, search, query, path, signal) =>
      searchCatalog(
        { ...access, origins, readBook: library.readBook },
        id,
        search,
        query,
        path,
        signal,
      ),
    readCatalogCover: (id, url, signal) => readCatalogCover(access, id, url, signal),
    downloadPublication: (publication, feedPosition, matching, defaults, onProgress, signal) =>
      downloadPublication(
        { ...access, origins, openFile: library.openFile, now: Date.now },
        publication,
        feedPosition,
        matching,
        defaults,
        onProgress,
        signal,
      ),
    updatePublication: (publication, bookId, feedPosition, onProgress, signal) =>
      updatePublication(
        { ...access, origins, replaceBookFile: library.replaceBookFile, now: Date.now },
        publication,
        bookId,
        feedPosition,
        onProgress,
        signal,
      ),
    forgetOrigin: (bookId: BookId) => forgetOrigin({ origins }, bookId),
  };
}

export { buildCatalog };
export type { CatalogLibrary, CatalogUseCases };
