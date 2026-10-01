import { keepPreviousData, mutationOptions, queryOptions, skipToken } from '@tanstack/svelte-query';
import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import { QueryFailure, unwrap } from '$lib/shared/query-failure';
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
  readonly readBook: (id: BookId) => Promise<Result<Book, LibraryError>>;
  readonly readCover: (id: BookId) => Promise<Result<Blob | null, LibraryError>>;
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

type BookAnswer = { readonly kind: 'found'; readonly book: Book } | { readonly kind: 'missing' };

type BookMark = 'finished' | 'unread';

type UploadRequest = {
  readonly files: readonly File[];
  readonly matching: BookMatching;
  readonly report: UploadReport;
};

type EditRequest = { readonly id: BookId; readonly edit: BookEdit };

type MarkRequest = { readonly id: BookId; readonly mark: BookMark };

const BOOK_MISSING: BookAnswer = { kind: 'missing' };

function bookAnswer(read: Result<Book, LibraryError>): BookAnswer {
  if (read.ok) return { kind: 'found', book: read.value };
  return match(read.error)
    .with({ kind: 'not-found' }, () => BOOK_MISSING)
    .with({ kind: 'storage-unavailable' }, { kind: 'storage-failed' }, (failed) => {
      throw new QueryFailure(describeLibraryError(failed), { cause: failed });
    })
    .exhaustive();
}

function newestFirst(books: readonly Book[]): readonly Book[] {
  return books.toSorted((a, b) => b.addedAt - a.addedAt);
}

function heldCover(cover: Result<Blob | null, LibraryError>): Blob | null {
  if (cover.ok) return cover.value;
  return match(cover.error)
    .with({ kind: 'not-found' }, { kind: 'storage-unavailable' }, () => null)
    .with({ kind: 'storage-failed' }, (failed) => {
      throw new QueryFailure(describeLibraryError(failed), { cause: failed });
    })
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
      return newestFirst(unwrap(listed, describeLibraryError));
    },
    staleTime: 0,
  });
}

function bookQuery(library: Pick<LibraryReads, 'readBook'>, id: BookId | null) {
  return queryOptions({
    queryKey: libraryKeys.book(id),
    queryFn:
      id === null
        ? skipToken
        : async () => {
            const read = await library.readBook(id);
            return bookAnswer(read);
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
    mutationFn: (id: BookId) => library.removeBook(id),
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
  BOOK_MISSING,
  bookAnswer,
  bookQuery,
  booksQuery,
  coversQuery,
  editBookMutation,
  librarySizeQuery,
  markBookMutation,
  newestFirst,
  openFileMutation,
  removeBookMutation,
};
export type {
  BookAnswer,
  BookMark,
  EditRequest,
  LibraryReads,
  LibraryWrites,
  MarkRequest,
  UploadRequest,
};
