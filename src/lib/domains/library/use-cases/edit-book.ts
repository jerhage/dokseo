import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Book, BookEdit } from '../domain/book/book';
import type { LibraryRepository } from '../domain/book/library-repository';

type EditBookResult =
  | { readonly kind: 'success'; readonly book: Book }
  | { readonly kind: 'not-found'; readonly id: BookId }
  | StorageUnavailable;

type EditBookDeps = {
  readonly repository: LibraryRepository;
};

async function editBook(deps: EditBookDeps, id: BookId, edit: BookEdit): Promise<EditBookResult> {
  const updated = await deps.repository.update(id, edit);
  if (updated.kind !== 'success') return updated;
  if (updated.book === null) return { kind: 'not-found', id };
  return { kind: 'success', book: updated.book };
}

export { editBook };
export type { EditBookDeps, EditBookResult };
