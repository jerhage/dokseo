import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { LibraryRepository } from '../domain/book/library-repository';

type ReadCoverResult =
  | { readonly kind: 'success'; readonly cover: Blob | null }
  | StorageUnavailable;

type ReadCoverDeps = {
  readonly repository: LibraryRepository;
};

async function readCover(deps: ReadCoverDeps, id: BookId): Promise<ReadCoverResult> {
  const read = await deps.repository.readCover(id);
  if (read.kind !== 'success') return read;
  return { kind: 'success', cover: read.file };
}

export { readCover };
export type { ReadCoverDeps, ReadCoverResult };
