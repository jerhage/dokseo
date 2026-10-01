import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { LibraryRepository } from '../domain/book/library-repository';

type ReadSourceResult =
  | { readonly kind: 'success'; readonly source: Blob }
  | { readonly kind: 'source-missing'; readonly id: BookId }
  | StorageUnavailable;

type ReadSourceDeps = {
  readonly repository: LibraryRepository;
};

async function readSource(deps: ReadSourceDeps, id: BookId): Promise<ReadSourceResult> {
  const read = await deps.repository.readSource(id);
  if (read.kind !== 'success') return read;
  if (read.file === null) return { kind: 'source-missing', id };
  return { kind: 'success', source: read.file };
}

export { readSource };
export type { ReadSourceDeps, ReadSourceResult };
