import { match } from 'ts-pattern';
import type { BookId } from '$lib/shared/ids';
import { PRIVATE_WINDOW_ADVICE } from '$lib/shared/storage-unavailable';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type LibraryRefusal = { readonly kind: 'not-found'; readonly id: BookId } | StorageUnavailable;

const LIBRARY_UNAVAILABLE = `This browser blocks local storage, so uploads cannot be kept. ${PRIVATE_WINDOW_ADVICE}`;

const UNREADABLE_BOOK =
  'This book was stored in a shape this version cannot read. Upload the same file again in the library to repair it.';

function describeLibraryRefusal(refusal: LibraryRefusal): string {
  return match(refusal)
    .with({ kind: 'not-found' }, () => 'That upload is no longer in your library.')
    .with({ kind: 'storage-unavailable' }, () => LIBRARY_UNAVAILABLE)
    .exhaustive();
}

export { describeLibraryRefusal, LIBRARY_UNAVAILABLE, UNREADABLE_BOOK };
export type { LibraryRefusal };
