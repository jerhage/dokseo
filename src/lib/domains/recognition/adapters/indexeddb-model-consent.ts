import { getRecord, openDatabase, putRecord } from '$lib/platform/idb/connection';
import { describeCause } from '$lib/shared/cause';
import type { Language } from '$lib/shared/language';
import { err, ok, type Result } from '$lib/shared/result';
import {
  consentFromStored,
  decisionOf,
  grantedConsent,
  type ModelConsentDecision,
  type ModelConsentError,
  type ModelConsentStore,
  type StoredModelConsent,
} from '../domain/model-consent';

const DATABASE_NAME = 'recognition';

const DATABASE_VERSION = 1;

const CONSENT_STORE = 'model-consent';

function recordsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function unavailable(): Result<never, ModelConsentError> {
  return err({ kind: 'storage-unavailable' });
}

function failed(cause: unknown): Result<never, ModelConsentError> {
  return err({ kind: 'storage-failed', cause: describeCause(cause) });
}

function upgrade(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(CONSENT_STORE)) {
    db.createObjectStore(CONSENT_STORE, { keyPath: 'language' });
  }
}

export function createModelConsentStore(now: () => number = Date.now): ModelConsentStore {
  let connection: Promise<IDBDatabase> | null = null;

  const database = (): Promise<IDBDatabase> => {
    if (connection === null) {
      const opening = openDatabase(DATABASE_NAME, DATABASE_VERSION, upgrade);
      opening.catch(() => {
        connection = null;
      });
      connection = opening;
    }
    return connection;
  };

  return {
    async decisionFor(
      language: Language,
    ): Promise<Result<ModelConsentDecision, ModelConsentError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const record = await getRecord<StoredModelConsent>(
          await database(),
          CONSENT_STORE,
          language,
        );
        return ok(decisionOf(record === undefined ? null : consentFromStored(record), language));
      } catch (cause) {
        return failed(cause);
      }
    },

    async recordGrant(language: Language): Promise<Result<void, ModelConsentError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        await putRecord(await database(), CONSENT_STORE, grantedConsent(language, now()));
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}
