import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type LibraryRefusal = { readonly kind: 'not-found'; readonly id: BookId } | StorageUnavailable;

const LIBRARY_UNAVAILABLE = 'This browser blocks local storage, so uploads cannot be kept.';

function describeLibraryRefusal(refusal: LibraryRefusal): string {
  return match(refusal)
    .with({ kind: 'not-found' }, () => 'That upload is no longer in your library.')
    .with({ kind: 'storage-unavailable' }, () => LIBRARY_UNAVAILABLE)
    .exhaustive();
}

export { describeLibraryRefusal, LIBRARY_UNAVAILABLE };
export type { LibraryRefusal };
