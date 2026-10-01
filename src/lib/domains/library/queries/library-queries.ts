import { keepPreviousData, mutationOptions, queryOptions } from '@tanstack/svelte-query';
import type { BookId } from '$lib/shared/ids';
import { unwrap } from '$lib/shared/query-failure';
import type { Result } from '$lib/shared/result';
import type { Book, BookEdit } from '../domain/book/book';
import type { BookMatching } from '../domain/book/book-matching';
import type { LibraryError } from '../domain/book/library-repository';
import type { UploadReport } from '../domain/ingest/upload-progress';
import type { OpenedUpload, OpenFileError } from '../use-cases/open-file';
import { describeLibraryError } from './library-error-text';
import { libraryKeys } from './library-keys';

type LibraryReads = {
  readonly listBooks: () => Promise<Result<readonly Book[], LibraryError>>;
  readonly readCover: (id: BookId) => Promise<Result<Blob, LibraryError>>;
  readonly readLibrarySize: () => Promise<Result<number, LibraryError>>;
};

type LibraryWrites = {
  readonly openFile: (
    files: readonly File[],
    matching: BookMatching,
    report?: UploadReport,
  ) => Promise<Result<OpenedUpload, OpenFileError>>;
  readonly removeBook: (id: BookId) => Promise<Result<void, LibraryError>>;
  readonly editBook: (id: BookId, edit: BookEdit) => Promise<Result<Book, LibraryError>>;
  readonly markFinished: (id: BookId) => Promise<Result<Book, LibraryError>>;
  readonly markUnread: (id: BookId) => Promise<Result<Book, LibraryError>>;
};

type BookMark = 'finished' | 'unread';

type UploadRequest = {
  readonly files: readonly File[];
  readonly matching: BookMatching;
  readonly report: UploadReport;
};

type EditRequest = { readonly id: BookId; readonly edit: BookEdit };

type MarkRequest = { readonly id: BookId; readonly mark: BookMark };

function newestFirst(books: readonly Book[]): readonly Book[] {
  return books.toSorted((a, b) => b.addedAt - a.addedAt);
}

async function readCovers(
  library: Pick<LibraryReads, 'readCover'>,
  ids: readonly BookId[],
): Promise<ReadonlyMap<BookId, Blob>> {
  const read = ids.map(async (id) => {
    const cover = await library.readCover(id);
    return cover.ok ? ([id, cover.value] as const) : null;
  });
  const found = await Promise.all(read);
  return new Map(found.filter((entry) => entry !== null));
}

function booksQuery(library: Pick<LibraryReads, 'listBooks'>) {
  return queryOptions({
    queryKey: libraryKeys.books(),
    queryFn: async () => {
      const listed = await library.listBooks();
      return newestFirst(unwrap(listed, describeLibraryError));
    },
    staleTime: 0,
  });
}

function coversQuery(library: Pick<LibraryReads, 'readCover'>, ids: readonly BookId[]) {
  return queryOptions({
    queryKey: libraryKeys.covers(ids),
    queryFn: () => readCovers(library, ids),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
}

function librarySizeQuery(library: Pick<LibraryReads, 'readLibrarySize'>) {
  return queryOptions({
    queryKey: libraryKeys.size(),
    queryFn: async () => {
      const size = await library.readLibrarySize();
      return size.ok ? size.value : null;
    },
    staleTime: 0,
  });
}

function openFileMutation(library: Pick<LibraryWrites, 'openFile'>) {
  return mutationOptions({
    mutationFn: ({ files, matching, report }: UploadRequest) =>
      library.openFile(files, matching, report),
  });
}

function removeBookMutation(library: Pick<LibraryWrites, 'removeBook'>) {
  return mutationOptions({
    mutationFn: async (id: BookId) => {
      const removed = await library.removeBook(id);
      return unwrap(removed, describeLibraryError);
    },
  });
}

function editBookMutation(library: Pick<LibraryWrites, 'editBook'>) {
  return mutationOptions({
    mutationFn: async ({ id, edit }: EditRequest) => {
      const edited = await library.editBook(id, edit);
      return unwrap(edited, describeLibraryError);
    },
  });
}

function markBookMutation(library: Pick<LibraryWrites, 'markFinished' | 'markUnread'>) {
  return mutationOptions({
    mutationFn: async ({ id, mark }: MarkRequest) => {
      const marked =
        mark === 'finished' ? await library.markFinished(id) : await library.markUnread(id);
      return unwrap(marked, describeLibraryError);
    },
  });
}

export {
  booksQuery,
  coversQuery,
  editBookMutation,
  librarySizeQuery,
  markBookMutation,
  newestFirst,
  openFileMutation,
  removeBookMutation,
};
export type { BookMark, EditRequest, LibraryReads, LibraryWrites, MarkRequest, UploadRequest };
