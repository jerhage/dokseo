import { listRecords, putRecord } from '$lib/platform/idb/connection';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type {
  TriedDownloadStore,
  TriedDownloadsRead,
  TriedDownloadsWrite,
} from '../domain/tried-downloads';
import { TRIED_DOWNLOADS_STORE, recordsAvailable, syncDatabase } from './sync-database';

type TriedRow = { readonly contentHash?: unknown };

function createTriedDownloadStore(): TriedDownloadStore {
  return {
    async list(): Promise<TriedDownloadsRead> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const rows = await listRecords<TriedRow>(await syncDatabase(), TRIED_DOWNLOADS_STORE);
      const hashes = new Set<string>();
      for (const row of rows) {
        if (typeof row.contentHash === 'string') hashes.add(row.contentHash);
      }
      return { kind: 'success', contentHashes: hashes };
    },

    async add(contentHash: string): Promise<TriedDownloadsWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await putRecord(await syncDatabase(), TRIED_DOWNLOADS_STORE, { contentHash });
      return { kind: 'success' };
    },
  };
}

export { createTriedDownloadStore };
