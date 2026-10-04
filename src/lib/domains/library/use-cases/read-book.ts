import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Book } from '../domain/book/book';
import type { LibraryRepository } from '../domain/book/library-repository';

type ReadBookResult =
  | { readonly kind: 'success'; readonly book: Book }
  | { readonly kind: 'not-found'; readonly id: BookId }
  | { readonly kind: 'unreadable-book'; readonly id: BookId }
  | StorageUnavailable;

type ReadBookDeps = {
  readonly repository: LibraryRepository;
};

async function readBook(deps: ReadBookDeps, id: BookId): Promise<ReadBookResult> {
  const found = await deps.repository.get(id);
  if (found.kind === 'unreadable-book') return { kind: 'unreadable-book', id };
  if (found.kind !== 'success') return found;
  if (found.book === null) return { kind: 'not-found', id };
  return { kind: 'success', book: found.book };
}

export { readBook };
export type { ReadBookDeps, ReadBookResult };
