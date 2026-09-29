import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

type SavePageListDeps = {
  readonly repository: LibraryRepository;
};

function savePageList(
  deps: SavePageListDeps,
  id: BookId,
  names: readonly string[],
): Promise<Result<void, LibraryError>> {
  return deps.repository.savePageList(id, names);
}

export { savePageList };
export type { SavePageListDeps };
