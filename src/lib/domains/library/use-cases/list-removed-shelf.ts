import type { BookId } from '$lib/shared/ids';
import type { LibraryRepository } from '../domain/book/library-repository';
import type { RemovedShelf } from '../domain/book/removed-book';
import { listBooks } from './list-books';
import { listRemovedBooks } from './list-removed-books';

type ListRemovedShelfDeps = {
  readonly repository: LibraryRepository;
};

async function listRemovedShelf(deps: ListRemovedShelfDeps): Promise<RemovedShelf> {
  const shelf = await listBooks(deps);
  if (shelf.kind !== 'success') return shelf;
  const removed = await listRemovedBooks(deps);
  if (removed.kind !== 'success') return removed;

  const held = new Set<BookId>([
    ...shelf.books.map((book) => book.id),
    ...shelf.unreadable.map((book) => book.id),
  ]);

  return { kind: 'success', books: removed.removed.filter((book) => !held.has(book.id)) };
}

export { listRemovedShelf };
export type { ListRemovedShelfDeps };
