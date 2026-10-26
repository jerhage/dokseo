import type { StorageUnavailable } from '$lib/shared/storage-unavailable';

type SyncConnection = {
  readonly serverUrl: string;
  readonly deviceId: string;
  readonly deviceName: string;
  readonly token: string;
  readonly cursor: number;
  readonly lastSyncAt: number | null;
};

type SyncStateRead =
  | { readonly kind: 'success'; readonly connection: SyncConnection | null }
  | StorageUnavailable;

type SyncStateWrite = { readonly kind: 'success' } | StorageUnavailable;

interface SyncStateStore {
  read(): Promise<SyncStateRead>;
  write(connection: SyncConnection): Promise<SyncStateWrite>;
  clear(): Promise<SyncStateWrite>;
}

export type { SyncConnection, SyncStateRead, SyncStateStore, SyncStateWrite };
