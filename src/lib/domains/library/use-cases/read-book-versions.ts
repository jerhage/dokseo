import type { RecordVersions } from '$lib/shared/change-marker';
import type { LibraryRepository } from '../domain/book/library-repository';

type ReadBookVersionsResult = RecordVersions;

type ReadBookVersionsDeps = { readonly repository: LibraryRepository };

function readBookVersions(deps: ReadBookVersionsDeps): Promise<ReadBookVersionsResult> {
  return deps.repository.recordVersions();
}

export { readBookVersions };
export type { ReadBookVersionsDeps, ReadBookVersionsResult };
