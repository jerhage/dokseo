import { queryOptions } from '@tanstack/svelte-query';
import type { ReadStorageAccountResult } from '../use-cases/read-storage-account';
import { storageKeys } from './storage-keys';

type StorageReads = {
  readonly readStorageAccount: () => Promise<ReadStorageAccountResult>;
};

function storageAccountQuery(storage: StorageReads) {
  return queryOptions({
    queryKey: storageKeys.account(),
    queryFn: async () => {
      const read = await storage.readStorageAccount();
      return read.account;
    },
    staleTime: 0,
  });
}

export { storageAccountQuery };
export type { StorageReads };
