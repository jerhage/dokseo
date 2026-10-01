import type { BookId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

type ReadSourceDeps = {
  readonly repository: LibraryRepository;
};

type ReadSourceError = LibraryError | { readonly kind: 'source-missing'; readonly id: BookId };

async function readSource(
  deps: ReadSourceDeps,
  id: BookId,
): Promise<Result<Blob, ReadSourceError>> {
  const source = await deps.repository.readSource(id);
  if (!source.ok) return source;
  if (source.value === null) return err({ kind: 'source-missing', id });
  return ok(source.value);
}

export { readSource };
export type { ReadSourceDeps, ReadSourceError };
