import { getRecord, putRecord } from '$lib/platform/idb/connection';
import type { Language } from '$lib/shared/language';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { storedSetup } from '../../domain/engine/recognizer-setup';
import type {
  RecognizerSetup,
  RecognizerSetupStore,
  SetupLookup,
  SetupWrite,
  StoredRecognizerSetup,
} from '../../domain/engine/recognizer-setup';
import { recognitionDatabase, recordsAvailable, SETUP_STORE } from '../recognition-database';

function createRecognizerSetupStore(): RecognizerSetupStore {
  return {
    async read(language: Language): Promise<SetupLookup> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const record = await getRecord<StoredRecognizerSetup>(
        await recognitionDatabase(),
        SETUP_STORE,
        language,
      );
      return { kind: 'success', stored: record ?? null };
    },

    async write(language: Language, setup: RecognizerSetup): Promise<SetupWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await putRecord(await recognitionDatabase(), SETUP_STORE, storedSetup(language, setup));
      return { kind: 'success' };
    },
  };
}

export { createRecognizerSetupStore };
