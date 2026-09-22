import { getRecord, putRecord } from '$lib/platform/idb/connection';
import { describeCause } from '$lib/shared/cause';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { ONE_READER, storedReadingSettings } from '../domain/reading-settings';
import type {
  ReadingSettings,
  ReadingSettingsError,
  ReadingSettingsStore,
  StoredReadingSettings,
} from '../domain/reading-settings';
import { flowingDatabase, READING_SETTINGS_STORE, recordsAvailable } from './flowing-database';

function unavailable(): Result<never, ReadingSettingsError> {
  return err({ kind: 'storage-unavailable' });
}

function failed(cause: unknown): Result<never, ReadingSettingsError> {
  return err({ kind: 'storage-failed', cause: describeCause(cause) });
}

function createReadingSettingsStore(): ReadingSettingsStore {
  return {
    async read(): Promise<Result<StoredReadingSettings | null, ReadingSettingsError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const record = await getRecord<StoredReadingSettings>(
          await flowingDatabase(),
          READING_SETTINGS_STORE,
          ONE_READER,
        );
        return ok(record ?? null);
      } catch (cause) {
        return failed(cause);
      }
    },

    async write(settings: ReadingSettings): Promise<Result<void, ReadingSettingsError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        await putRecord(
          await flowingDatabase(),
          READING_SETTINGS_STORE,
          storedReadingSettings(settings),
        );
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}

export { createReadingSettingsStore };
