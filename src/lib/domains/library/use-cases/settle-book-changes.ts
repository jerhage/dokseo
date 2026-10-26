import type { SettledMarker } from '$lib/shared/change-marker';
import type { LibraryRepository, LibraryWrite } from '../domain/book/library-repository';

type SettleBookChangesResult = LibraryWrite;

type SettleBookChangesDeps = { readonly repository: LibraryRepository };

function settleBookChanges(
  deps: SettleBookChangesDeps,
  settled: readonly SettledMarker[],
): Promise<SettleBookChangesResult> {
  return deps.repository.settleChanges(settled);
}

export { settleBookChanges };
export type { SettleBookChangesDeps, SettleBookChangesResult };
