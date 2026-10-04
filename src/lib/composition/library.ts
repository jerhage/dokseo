import { partialMd5 } from '$lib/platform/crypto/partial-md5';
import { requestPersistence } from '$lib/platform/storage/persistence';
import type { BookId } from '$lib/shared/ids';
import type { PageSource } from '$lib/shared/page-source';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { blobDigestHasher } from '../domains/library/adapters/blob-digest-hasher';
import { createFileSourceBuilder } from '../domains/library/adapters/file-source-builder';
import {
  listStoredPageNames,
  openListedPageSource,
  openStoredPageSource,
} from '../domains/library/adapters/stored-page-source';
import type { BookEdit } from '../domains/library/domain/book/book';
import type { MergeInto } from '../domains/library/domain/book/book-merge';
import type { BookMatching } from '../domains/library/domain/book/book-matching';
import type { LibraryRepository } from '../domains/library/domain/book/library-repository';
import type { UploadReport } from '../domains/library/domain/ingest/upload-progress';
import { editBook } from '../domains/library/use-cases/edit-book';
import type { EditBookResult } from '../domains/library/use-cases/edit-book';
import { listBooks } from '../domains/library/use-cases/list-books';
import type { ListBooksResult } from '../domains/library/use-cases/list-books';
import { markFinished } from '../domains/library/use-cases/mark-finished';
import type { MarkFinishedResult } from '../domains/library/use-cases/mark-finished';
import { markUnread } from '../domains/library/use-cases/mark-unread';
import type { MarkUnreadResult } from '../domains/library/use-cases/mark-unread';
import { openFile } from '../domains/library/use-cases/open-file';
import type { OpenFileDeps, OpenFileResult } from '../domains/library/use-cases/open-file';
import { openForReading } from '../domains/library/use-cases/open-for-reading';
import type { OpenForReadingResult } from '../domains/library/use-cases/open-for-reading';
import { readBook } from '../domains/library/use-cases/read-book';
import type { ReadBookResult } from '../domains/library/use-cases/read-book';
import { readCover } from '../domains/library/use-cases/read-cover';
import type { ReadCoverResult } from '../domains/library/use-cases/read-cover';
import { readLibrarySize } from '../domains/library/use-cases/read-library-size';
import type { ReadLibrarySizeResult } from '../domains/library/use-cases/read-library-size';
import { readPageSizes } from '../domains/library/use-cases/read-page-sizes';
import type { ReadPageSizesResult } from '../domains/library/use-cases/read-page-sizes';
import { readSource } from '../domains/library/use-cases/read-source';
import type { ReadSourceResult } from '../domains/library/use-cases/read-source';
import { removeBook } from '../domains/library/use-cases/remove-book';
import type { RemoveBookResult } from '../domains/library/use-cases/remove-book';
import { saveReadingPlace } from '../domains/library/use-cases/save-reading-place';
import type { SaveReadingPlaceResult } from '../domains/library/use-cases/save-reading-place';

type LibraryUseCases = {
  readonly openFile: (
    files: readonly File[],
    matching: BookMatching,
    report?: UploadReport,
  ) => Promise<OpenFileResult>;
  readonly openForReading: (id: BookId) => Promise<OpenForReadingResult>;
  readonly listBooks: () => Promise<ListBooksResult>;
  readonly readBook: (id: BookId) => Promise<ReadBookResult>;
  readonly readCover: (id: BookId) => Promise<ReadCoverResult>;
  readonly readSource: (id: BookId) => Promise<ReadSourceResult>;
  readonly editBook: (id: BookId, edit: BookEdit) => Promise<EditBookResult>;
  readonly removeBook: (id: BookId) => Promise<RemoveBookResult>;
  readonly saveReadingPlace: (id: BookId, place: ReadingPlace) => Promise<SaveReadingPlaceResult>;
  readonly markFinished: (id: BookId) => Promise<MarkFinishedResult>;
  readonly markUnread: (id: BookId) => Promise<MarkUnreadResult>;
  readonly readLibrarySize: () => Promise<ReadLibrarySizeResult>;
  readonly readPageSizes: (source: PageSource) => Promise<ReadPageSizesResult>;
};

function buildLibrary(repository: LibraryRepository, mergeInto: MergeInto): LibraryUseCases {
  const openFileDeps: OpenFileDeps = {
    repository,
    mergeInto,
    builder: createFileSourceBuilder(),
    inspectEpub: async (source: Blob) => {
      const { inspectEpubArchive } = await import('../domains/library/adapters/zip-epub-inspector');
      return await inspectEpubArchive(source);
    },
    partialMd5: blobDigestHasher(partialMd5),
    requestPersistence,
    now: Date.now,
    newId: () => crypto.randomUUID(),
  };

  return {
    openFile: (files: readonly File[], matching: BookMatching, report?: UploadReport) =>
      openFile(openFileDeps, files, report, matching),
    openForReading: (id: BookId) =>
      openForReading(
        {
          repository,
          openPages: openStoredPageSource,
          openListedPages: openListedPageSource,
          listPageNames: listStoredPageNames,
        },
        id,
      ),
    listBooks: () => listBooks({ repository }),
    readBook: (id: BookId) => readBook({ repository }, id),
    readCover: (id: BookId) => readCover({ repository }, id),
    readSource: (id: BookId) => readSource({ repository }, id),
    editBook: (id: BookId, edit: BookEdit) => editBook({ repository }, id, edit),
    removeBook: (id: BookId) => removeBook({ repository, now: Date.now }, id),
    saveReadingPlace: (id: BookId, place: ReadingPlace) =>
      saveReadingPlace({ repository, now: Date.now }, id, place),
    markFinished: (id: BookId) => markFinished({ repository, now: Date.now }, id),
    markUnread: (id: BookId) => markUnread({ repository }, id),
    readLibrarySize: () => readLibrarySize({ repository }),
    readPageSizes: (source: PageSource) => readPageSizes(source),
  };
}

export { buildLibrary };
export type { LibraryUseCases };
