import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { LibraryRepository } from '../domain/book/library-repository';

type ReadLibrarySizeResult =
  | { readonly kind: 'success'; readonly bytes: number }
  | StorageUnavailable;

type ReadLibrarySizeDeps = {
  readonly repository: LibraryRepository;
};

function readLibrarySize(deps: ReadLibrarySizeDeps): Promise<ReadLibrarySizeResult> {
  return deps.repository.storedBytes();
}

export { readLibrarySize };
export type { ReadLibrarySizeDeps, ReadLibrarySizeResult };
