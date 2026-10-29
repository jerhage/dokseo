import type { ContentHash } from '$lib/shared/ids';
import type { LibraryRepository, LibraryWrite } from '../domain/book/library-repository';

type MarkBookChangedResult = LibraryWrite;

type MarkBookChangedDeps = { readonly repository: LibraryRepository };

function markBookChanged(
  deps: MarkBookChangedDeps,
  hash: ContentHash,
): Promise<MarkBookChangedResult> {
  return deps.repository.markChanged(hash);
}

export { markBookChanged };
export type { MarkBookChangedDeps, MarkBookChangedResult };
