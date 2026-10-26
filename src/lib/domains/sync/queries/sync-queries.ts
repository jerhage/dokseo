import { queryOptions } from '@tanstack/svelte-query';
import type { ListRemoteBooksResult } from '../use-cases/list-remote-books';
import type { SyncDevicesResult } from '../use-cases/sync-devices';
import type { SyncStatusResult } from '../use-cases/sync-status';
import { syncKeys } from './sync-keys';

type SyncReads = {
  readonly syncStatus: () => Promise<SyncStatusResult>;
  readonly syncDevices: () => Promise<SyncDevicesResult>;
  readonly remoteBooks: () => Promise<ListRemoteBooksResult>;
};

function syncStatusQuery(sync: Pick<SyncReads, 'syncStatus'>) {
  return queryOptions({
    queryKey: syncKeys.status(),
    queryFn: () => sync.syncStatus(),
    staleTime: 0,
  });
}

function syncDevicesQuery(sync: Pick<SyncReads, 'syncDevices'>) {
  return queryOptions({
    queryKey: syncKeys.devices(),
    queryFn: () => sync.syncDevices(),
    staleTime: 0,
  });
}

function remoteBooksQuery(sync: Pick<SyncReads, 'remoteBooks'>) {
  return queryOptions({
    queryKey: syncKeys.remoteBooks(),
    queryFn: () => sync.remoteBooks(),
    staleTime: 0,
  });
}

export { remoteBooksQuery, syncDevicesQuery, syncStatusQuery };
export type { SyncReads };
