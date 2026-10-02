import { keepPreviousData, mutationOptions, queryOptions, skipToken } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import type { Book, BookEdit } from '../domain/book/book';
import type { BookMatching } from '../domain/book/book-matching';
import type { CapturesDeletion, RemovedShelf } from '../domain/book/removed-book';
import type { UploadReport } from '../domain/ingest/upload-progress';
import type { EditBookResult } from '../use-cases/edit-book';
import type { ListBooksResult } from '../use-cases/list-books';
import type { MarkFinishedResult } from '../use-cases/mark-finished';
import type { MarkUnreadResult } from '../use-cases/mark-unread';
import type { OpenFileResult } from '../use-cases/open-file';
import type { ReadBookResult } from '../use-cases/read-book';
import type { ReadCoverResult } from '../use-cases/read-cover';
import type { ReadLibrarySizeResult } from '../use-cases/read-library-size';
import type { RemoveBookResult } from '../use-cases/remove-book';
import { libraryKeys } from './library-keys';

type LibraryReads = {
  readonly listBooks: () => Promise<ListBooksResult>;
  readonly readBook: (id: BookId) => Promise<ReadBookResult>;
  readonly readCover: (id: BookId) => Promise<ReadCoverResult>;
  readonly readLibrarySize: () => Promise<ReadLibrarySizeResult>;
  readonly listRemovedBooks: () => Promise<RemovedShelf>;
};

type LibraryWrites = {
  readonly openFile: (
    files: readonly File[],
    matching: BookMatching,
    report?: UploadReport,
  ) => Promise<OpenFileResult>;
  readonly removeBook: (id: BookId) => Promise<RemoveBookResult>;
  readonly editBook: (id: BookId, edit: BookEdit) => Promise<EditBookResult>;
  readonly markFinished: (id: BookId) => Promise<MarkFinishedResult>;
  readonly markUnread: (id: BookId) => Promise<MarkUnreadResult>;
  readonly deleteRemovedBookCaptures: (id: BookId) => Promise<CapturesDeletion>;
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

function sortedListing(listed: ListBooksResult): ListBooksResult {
  return match(listed)
    .with({ kind: 'success' }, (listing): ListBooksResult => ({
      ...listing,
      books: newestFirst(listing.books),
    }))
    .with({ kind: 'storage-unavailable' }, (blocked) => blocked)
    .exhaustive();
}

function heldCover(cover: ReadCoverResult): Blob | null {
  return match(cover)
    .with({ kind: 'success' }, (read) => read.cover)
    .with({ kind: 'storage-unavailable' }, () => null)
    .exhaustive();
}

function measuredSize(size: ReadLibrarySizeResult): number | null {
  return match(size)
    .with({ kind: 'success' }, ({ bytes }) => bytes)
    .with({ kind: 'storage-unavailable' }, () => null)
    .exhaustive();
}

async function readCovers(
  library: Pick<LibraryReads, 'readCover'>,
  ids: readonly BookId[],
): Promise<ReadonlyMap<BookId, Blob>> {
  const read = ids.map(async (id) => {
    const cover = heldCover(await library.readCover(id));
    return cover === null ? null : ([id, cover] as const);
  });
  const found = await Promise.all(read);
  return new Map(found.filter((entry) => entry !== null));
}

function booksQuery(library: Pick<LibraryReads, 'listBooks'>) {
  return queryOptions({
    queryKey: libraryKeys.books(),
    queryFn: async () => {
      const listed = await library.listBooks();
      return sortedListing(listed);
    },
    staleTime: 0,
  });
}

function bookQuery(library: Pick<LibraryReads, 'readBook'>, id: BookId | null) {
  return queryOptions({
    queryKey: libraryKeys.book(id),
    queryFn: id === null ? skipToken : () => library.readBook(id),
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
      return measuredSize(size);
    },
    staleTime: 0,
  });
}

function removedBooksQuery(library: Pick<LibraryReads, 'listRemovedBooks'>) {
  return queryOptions({
    queryKey: libraryKeys.removed(),
    queryFn: () => library.listRemovedBooks(),
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
    mutationFn: (id: BookId) => library.removeBook(id),
  });
}

function deleteRemovedCapturesMutation(library: Pick<LibraryWrites, 'deleteRemovedBookCaptures'>) {
  return mutationOptions({
    mutationFn: (id: BookId) => library.deleteRemovedBookCaptures(id),
  });
}

function editBookMutation(library: Pick<LibraryWrites, 'editBook'>) {
  return mutationOptions({
    mutationFn: ({ id, edit }: EditRequest) => library.editBook(id, edit),
  });
}

function markBookMutation(library: Pick<LibraryWrites, 'markFinished' | 'markUnread'>) {
  return mutationOptions({
    mutationFn: ({ id, mark }: MarkRequest) =>
      mark === 'finished' ? library.markFinished(id) : library.markUnread(id),
  });
}

export {
  bookQuery,
  booksQuery,
  coversQuery,
  deleteRemovedCapturesMutation,
  editBookMutation,
  librarySizeQuery,
  markBookMutation,
  newestFirst,
  openFileMutation,
  removeBookMutation,
  removedBooksQuery,
};
export type { BookMark, EditRequest, LibraryReads, LibraryWrites, MarkRequest, UploadRequest };
