import { deleteRecord, getRecord, putRecord } from '$lib/platform/idb/connection';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import {
  CONNECTION_ROW,
  connectionFromStored,
  storedConnection,
} from '../domain/stored-connection';
import type { StoredConnection } from '../domain/stored-connection';
import type {
  SyncConnection,
  SyncStateRead,
  SyncStateStore,
  SyncStateWrite,
} from '../domain/sync-state';
import { SETTINGS_STORE, recordsAvailable, syncDatabase } from './sync-database';

function createSyncStateStore(): SyncStateStore {
  return {
    async read(): Promise<SyncStateRead> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const row = await getRecord<StoredConnection>(
        await syncDatabase(),
        SETTINGS_STORE,
        CONNECTION_ROW,
      );
      return { kind: 'success', connection: connectionFromStored(row) };
    },

    async write(connection: SyncConnection): Promise<SyncStateWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await putRecord(await syncDatabase(), SETTINGS_STORE, storedConnection(connection));
      return { kind: 'success' };
    },

    async clear(): Promise<SyncStateWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await deleteRecord(await syncDatabase(), SETTINGS_STORE, CONNECTION_ROW);
      return { kind: 'success' };
    },
  };
}

export { createSyncStateStore };
