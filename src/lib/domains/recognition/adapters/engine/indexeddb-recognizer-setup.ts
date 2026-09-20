import { getRecord, putRecord } from '$lib/platform/idb/connection';
import { describeCause } from '$lib/shared/cause';
import type { Language } from '$lib/shared/language';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { storedSetup } from '../../domain/engine/recognizer-setup';
import type {
  RecognizerSetup,
  RecognizerSetupStore,
  SetupError,
  StoredRecognizerSetup,
} from '../../domain/engine/recognizer-setup';
import { recognitionDatabase, recordsAvailable, SETUP_STORE } from '../recognition-database';

function unavailable(): Result<never, SetupError> {
  return err({ kind: 'storage-unavailable' });
}

function failed(cause: unknown): Result<never, SetupError> {
  return err({ kind: 'storage-failed', cause: describeCause(cause) });
}

function createRecognizerSetupStore(): RecognizerSetupStore {
  return {
    async read(language: Language): Promise<Result<StoredRecognizerSetup | null, SetupError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const record = await getRecord<StoredRecognizerSetup>(
          await recognitionDatabase(),
          SETUP_STORE,
          language,
        );
        return ok(record ?? null);
      } catch (cause) {
        return failed(cause);
      }
    },

    async write(language: Language, setup: RecognizerSetup): Promise<Result<void, SetupError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        await putRecord(await recognitionDatabase(), SETUP_STORE, storedSetup(language, setup));
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}

export { createRecognizerSetupStore };
