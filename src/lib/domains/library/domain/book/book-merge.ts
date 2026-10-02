import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type BookMerge =
  | { readonly kind: 'merged' }
  | { readonly kind: 'partly-merged' }
  | StorageUnavailable;

type HeldMerge = { readonly kind: 'nothing-to-merge' } | BookMerge;

type MergeInto = (into: BookId, strays: readonly BookId[]) => Promise<BookMerge>;

const NOTHING_TO_MERGE: HeldMerge = { kind: 'nothing-to-merge' };

export { NOTHING_TO_MERGE };
export type { BookMerge, HeldMerge, MergeInto };
