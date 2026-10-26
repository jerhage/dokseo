import { deleteRecord, listRecords, putRecord } from '$lib/platform/idb/connection';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { isChange } from '../domain/change';
import type { Change, SyncKind } from '../domain/change';
import type { HeldChangeStore, HeldChangesRead, HeldChangesWrite } from '../domain/held-changes';
import { HELD_CHANGES_STORE, recordsAvailable, syncDatabase } from './sync-database';

const WRITTEN: HeldChangesWrite = { kind: 'success' };

function createHeldChangeStore(): HeldChangeStore {
  return {
    async list(): Promise<HeldChangesRead> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const rows = await listRecords<unknown>(await syncDatabase(), HELD_CHANGES_STORE);
      return { kind: 'success', changes: rows.filter(isChange) };
    },

    async put(change: Change): Promise<HeldChangesWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await putRecord(await syncDatabase(), HELD_CHANGES_STORE, change);
      return WRITTEN;
    },

    async remove(kind: SyncKind, recordId: string): Promise<HeldChangesWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await deleteRecord(await syncDatabase(), HELD_CHANGES_STORE, [kind, recordId]);
      return WRITTEN;
    },
  };
}

export { createHeldChangeStore };
