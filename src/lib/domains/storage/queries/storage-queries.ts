import { queryOptions } from '@tanstack/svelte-query';
import { unwrap } from '$lib/shared/query-failure';
import type { Result } from '$lib/shared/result';
import type { OriginStoresError } from '../domain/origin-stores';
import type { StorageAccount } from '../domain/storage-parts';
import { storageKeys } from './storage-keys';

type StorageReads = {
  readonly readStorageAccount: () => Promise<Result<StorageAccount, OriginStoresError>>;
};

function failureNote(error: OriginStoresError): string {
  return `What this app stores could not be read: ${error.cause}`;
}

function storageAccountQuery(storage: StorageReads) {
  return queryOptions({
    queryKey: storageKeys.account(),
    queryFn: async () => {
      const read = await storage.readStorageAccount();
      return unwrap(read, failureNote);
    },
    staleTime: 0,
  });
}

export { failureNote, storageAccountQuery };
export type { StorageReads };
