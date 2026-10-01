import { match } from 'ts-pattern';
import type { Notify } from '$lib/shared/notice';

type WriteOutcome = 'saved' | 'failed';

type StorageFailure =
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'storage-failed'; readonly cause: string }
  | { readonly kind: 'not-stored' };

const NOT_STORED: StorageFailure = { kind: 'not-stored' };

function describeStorageFailure(failure: StorageFailure): string {
  return match(failure)
    .with({ kind: 'storage-unavailable' }, () => 'This browser blocks local storage.')
    .with({ kind: 'storage-failed' }, (failed) => `Local storage failed: ${failed.cause}`)
    .with({ kind: 'not-stored' }, () => 'This capture is not in storage.')
    .exhaustive();
}

function refuse(notify: Notify, title: string, failure: StorageFailure): 'failed' {
  notify({ tone: 'danger', title, message: describeStorageFailure(failure) });
  return 'failed';
}

export { NOT_STORED, describeStorageFailure, refuse };
export type { StorageFailure, WriteOutcome };
