import { getRecord, putRecord } from '$lib/platform/idb/connection';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { ONE_READER, storedReadingSettings } from '../domain/reading-settings';
import type {
  ReadingSettings,
  ReadingSettingsStore,
  SettingsWrite,
  StoredReadingSettings,
  StoredSettingsRead,
} from '../domain/reading-settings';
import { flowingDatabase, READING_SETTINGS_STORE, recordsAvailable } from './flowing-database';

function createReadingSettingsStore(): ReadingSettingsStore {
  return {
    async read(): Promise<StoredSettingsRead> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const record = await getRecord<StoredReadingSettings>(
        await flowingDatabase(),
        READING_SETTINGS_STORE,
        ONE_READER,
      );
      return { kind: 'success', stored: record ?? null };
    },

    async write(settings: ReadingSettings): Promise<SettingsWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await putRecord(
        await flowingDatabase(),
        READING_SETTINGS_STORE,
        storedReadingSettings(settings),
      );
      return { kind: 'success' };
    },
  };
}

export { createReadingSettingsStore };
