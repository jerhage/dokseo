import { deleteRecord, getRecord, putRecord } from '$lib/platform/idb/connection';
import { describeCause } from '$lib/shared/cause';
import type { Language } from '$lib/shared/language';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { consentFromStored, decisionOf, grantedConsent } from '../../domain/model/model-consent';
import type {
  ModelConsentDecision,
  ModelConsentError,
  ModelConsentStore,
  StoredModelConsent,
} from '../../domain/model/model-consent';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import { CONSENT_STORE, recognitionDatabase, recordsAvailable } from '../recognition-database';

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
      model: ModelFootprint | null,
    ): Promise<Result<ModelConsentDecision, ModelConsentError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        const record = await getRecord<StoredModelConsent>(
          await recognitionDatabase(),
          CONSENT_STORE,
          language,
        );
        return ok(decisionOf(record === undefined ? null : consentFromStored(record), model));
      } catch (cause) {
        return failed(cause);
      }
    },

    async recordGrant(
      language: Language,
      model: ModelFootprint | null,
    ): Promise<Result<void, ModelConsentError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        await putRecord(
          await recognitionDatabase(),
          CONSENT_STORE,
          grantedConsent(language, now(), model),
        );
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },

    async forgetGrant(language: Language): Promise<Result<void, ModelConsentError>> {
      if (!recordsAvailable()) return unavailable();
      try {
        await deleteRecord(await recognitionDatabase(), CONSENT_STORE, language);
        return ok(undefined);
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}
