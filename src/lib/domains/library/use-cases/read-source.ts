import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

type ReadSourceDeps = {
  readonly repository: LibraryRepository;
};

function readSource(deps: ReadSourceDeps, id: BookId): Promise<Result<Blob, LibraryError>> {
  return deps.repository.readSource(id);
}

export { readSource };
export type { ReadSourceDeps };
