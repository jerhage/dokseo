import type { Result } from '$lib/shared/result';
import type { LibraryError, LibraryRepository } from '../domain/library-repository';

export type ReadLibrarySizeDeps = {
  readonly repository: LibraryRepository;
};

export function readLibrarySize(deps: ReadLibrarySizeDeps): Promise<Result<number, LibraryError>> {
  return deps.repository.storedBytes();
}
