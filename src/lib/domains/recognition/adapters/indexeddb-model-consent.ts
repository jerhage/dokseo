import { getRecord, putRecord } from '$lib/platform/idb/connection';
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
import { CONSENT_STORE, recognitionDatabase, recordsAvailable } from './recognition-database';

function unavailable(): Result<never, ModelConsentError> {
  return err({ kind: 'storage-unavailable' });
}

function failed(cause: unknown): Result<never, ModelConsentError> {
  return err({ kind: 'storage-failed', cause: describeCause(cause) });
}

export function createModelConsentStore(now: () => number = Date.now): ModelConsentStore {
  return {
    async decisionFor(
      language: Language,
    ): Promise<Result<ModelConsentDecision, ModelConsentError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const record = await getRecord<StoredModelConsent>(
          await recognitionDatabase(),
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
        await putRecord(
          await recognitionDatabase(),
          CONSENT_STORE,
          grantedConsent(language, now()),
        );
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}
