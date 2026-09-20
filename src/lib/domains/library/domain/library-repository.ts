import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Book, BookEdit } from './book';
import type { SourceWriteReport } from './upload-progress';

export type LibraryError =
  | { readonly kind: 'not-found'; readonly id: BookId }
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'storage-failed'; readonly cause: string };

export interface LibraryRepository {
  list(): Promise<Result<readonly Book[], LibraryError>>;
  get(id: BookId): Promise<Result<Book, LibraryError>>;
  add(
    book: Book,
    source: Blob,
    cover: Blob,
    report: SourceWriteReport,
  ): Promise<Result<void, LibraryError>>;
  remove(id: BookId): Promise<Result<void, LibraryError>>;
  update(id: BookId, edit: BookEdit): Promise<Result<Book, LibraryError>>;
  readSource(id: BookId): Promise<Result<Blob, LibraryError>>;
  readCover(id: BookId): Promise<Result<Blob, LibraryError>>;
  storedBytes(): Promise<Result<number, LibraryError>>;
}
