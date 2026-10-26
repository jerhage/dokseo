import type { PendingMarkers } from '$lib/shared/change-marker';
import type { LibraryRepository } from '../domain/book/library-repository';

type ReadPendingBookChangesResult = PendingMarkers;

type ReadPendingBookChangesDeps = { readonly repository: LibraryRepository };

function readPendingBookChanges(
  deps: ReadPendingBookChangesDeps,
): Promise<ReadPendingBookChangesResult> {
  return deps.repository.pendingChanges();
}

export { readPendingBookChanges };
export type { ReadPendingBookChangesDeps, ReadPendingBookChangesResult };
