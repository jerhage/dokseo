import { queryOptions } from '@tanstack/svelte-query';
import type { SyncDevicesResult } from '../use-cases/sync-devices';
import type { SyncStatusResult } from '../use-cases/sync-status';
import { syncKeys } from './sync-keys';

type SyncReads = {
  readonly syncStatus: () => Promise<SyncStatusResult>;
  readonly syncDevices: () => Promise<SyncDevicesResult>;
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

export { syncDevicesQuery, syncStatusQuery };
export type { SyncReads };
