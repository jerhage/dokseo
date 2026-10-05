import { match } from 'ts-pattern';
import { eraseBook } from '$lib/domains/library/use-cases/erase-book';
import type { EraseBookDeps } from '$lib/domains/library/use-cases/erase-book';
import { moveCaptures } from '$lib/domains/recognition/use-cases/capture/move-captures';
import type { MoveCapturesDeps } from '$lib/domains/recognition/use-cases/capture/move-captures';
import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type MergeIntoBookResult =
  | { readonly kind: 'merged' }
  | { readonly kind: 'partly-merged' }
  | StorageUnavailable;

type MergeIntoBookDeps = {
  readonly moving: MoveCapturesDeps;
  readonly erasing: EraseBookDeps;
};

type StrayMerge =
  | { readonly kind: 'merged' }
  | { readonly kind: 'captures-moved' }
  | StorageUnavailable;

const MERGED: MergeIntoBookResult = { kind: 'merged' };

const PARTLY_MERGED: MergeIntoBookResult = { kind: 'partly-merged' };

async function mergeStray(
  deps: MergeIntoBookDeps,
  into: BookId,
  stray: BookId,
): Promise<StrayMerge> {
  const moved = await moveCaptures(deps.moving, stray, into);
  if (moved.kind !== 'success') return moved;
  const erased = await eraseBook(deps.erasing, stray);
  if (erased.kind !== 'success') return { kind: 'captures-moved' };

  return { kind: 'merged' };
}

async function mergeIntoBook(
  deps: MergeIntoBookDeps,
  into: BookId,
  strays: readonly BookId[],
): Promise<MergeIntoBookResult> {
  let changed = false;
  for (const stray of strays) {
    const merged = await mergeStray(deps, into, stray);
    const stopped = match(merged)
      .returnType<MergeIntoBookResult | null>()
      .with({ kind: 'merged' }, () => null)
      .with({ kind: 'captures-moved' }, () => PARTLY_MERGED)
      .with({ kind: 'storage-unavailable' }, (refusal) => (changed ? PARTLY_MERGED : refusal))
      .exhaustive();
    if (stopped !== null) return stopped;
    changed = true;
  }

  return MERGED;
}

export { mergeIntoBook };
export type { MergeIntoBookDeps, MergeIntoBookResult };
