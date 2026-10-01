import { match } from 'ts-pattern';
import { QueryFailure } from '$lib/shared/query-failure';
import { readFailed, readReady } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import type { Result } from '$lib/shared/result';
import type { CaptureError } from '../domain/capture/capture-repository';
import type { TagError } from '../domain/tag/tag-repository';

type StoreRead<T> =
  | { readonly kind: 'read'; readonly value: T }
  | { readonly kind: 'storage-unavailable' };

const STORAGE_UNAVAILABLE = { kind: 'storage-unavailable' } as const;

function describeStoreFailure(error: TagError | CaptureError): string {
  return match(error)
    .with({ kind: 'storage-unavailable' }, () => 'This browser blocks local storage.')
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .exhaustive();
}

function storeRead<T>(result: Result<T, TagError | CaptureError>): StoreRead<T> {
  if (result.ok) return { kind: 'read', value: result.value };

  return match(result.error)
    .with({ kind: 'storage-unavailable' }, (): StoreRead<T> => STORAGE_UNAVAILABLE)
    .with({ kind: 'storage-failed' }, (failed): StoreRead<T> => {
      throw new QueryFailure(describeStoreFailure(failed), { cause: failed });
    })
    .exhaustive();
}

function storedState<T>(state: ReadState<StoreRead<T>>): ReadState<T> {
  return match(state)
    .with({ kind: 'loading' }, { kind: 'failed' }, (unread): ReadState<T> => unread)
    .with({ kind: 'ready', value: { kind: 'read' } }, ({ value }) => readReady(value.value))
    .with({ kind: 'ready', value: { kind: 'storage-unavailable' } }, ({ value }) =>
      readFailed(describeStoreFailure(value)),
    )
    .exhaustive();
}

export { describeStoreFailure, storeRead, storedState };
export type { StoreRead };
