import type { Result } from '$lib/shared/result';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

type ReadLibrarySizeDeps = {
  readonly repository: LibraryRepository;
};

function readLibrarySize(deps: ReadLibrarySizeDeps): Promise<Result<number, LibraryError>> {
  return deps.repository.storedBytes();
}

export { readLibrarySize };
export type { ReadLibrarySizeDeps };
