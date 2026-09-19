import type { BookId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { LibraryError, LibraryRepository } from '../domain/library-repository';

export type ReadCoverDeps = {
	readonly repository: LibraryRepository;
};

export function readCover(
	deps: ReadCoverDeps,
	id: BookId
): Promise<Result<Blob, LibraryError>> {
	return deps.repository.readCover(id);
}
