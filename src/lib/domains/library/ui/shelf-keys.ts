import { match } from 'ts-pattern';
import type { ReadState } from '$lib/shared/read-state';
import type { ShelfEntry, UnreadableEntry } from '$lib/shared/reader-target';
import { LIBRARY_UNAVAILABLE } from '../queries/library-error-text';
import type { ListBooksResult } from '../use-cases/list-books';

type ShelfKeys =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | {
      readonly kind: 'listed';
      readonly entries: readonly ShelfEntry[];
      readonly unreadable: readonly UnreadableEntry[];
    };

const SHELF_KEYS_LOADING: ShelfKeys = { kind: 'loading' };

function shelfKeysOf(state: ReadState<ListBooksResult>): ShelfKeys {
  return match(state)
    .returnType<ShelfKeys>()
    .with({ kind: 'loading' }, () => SHELF_KEYS_LOADING)
    .with({ kind: 'failed' }, ({ message }) => ({ kind: 'failed', message }))
    .with({ kind: 'ready', value: { kind: 'success' } }, ({ value }) => ({
      kind: 'listed',
      entries: value.books.map((book) => ({ id: book.id, contentHash: book.contentHash })),
      unreadable: value.unreadable.map((row) => ({ id: row.id, contentHash: row.contentHash })),
    }))
    .with({ kind: 'ready', value: { kind: 'storage-unavailable' } }, () => ({
      kind: 'failed',
      message: LIBRARY_UNAVAILABLE,
    }))
    .exhaustive();
}

export { shelfKeysOf };
export type { ShelfKeys };
