import { deleteRecord, getRecord, putRecord } from '$lib/platform/idb/connection';
import type { Language } from '$lib/shared/language';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { consentFromStored, decisionOf, grantedConsent } from '../../domain/model/model-consent';
import type {
  ConsentLookup,
  ConsentWrite,
  ModelConsentStore,
  StoredModelConsent,
} from '../../domain/model/model-consent';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import { CONSENT_STORE, recognitionDatabase, recordsAvailable } from '../recognition-database';

const WRITTEN: ConsentWrite = { kind: 'success' };

function createModelConsentStore(now: () => number = Date.now): ModelConsentStore {
  return {
    async decisionFor(language: Language, model: ModelFootprint | null): Promise<ConsentLookup> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      const record = await getRecord<StoredModelConsent>(
        await recognitionDatabase(),
        CONSENT_STORE,
        language,
      );
      const consent = record === undefined ? null : consentFromStored(record);
      return { kind: 'success', decision: decisionOf(consent, model) };
    },

    async recordGrant(language: Language, model: ModelFootprint | null): Promise<ConsentWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await putRecord(
        await recognitionDatabase(),
        CONSENT_STORE,
        grantedConsent(language, now(), model),
      );
      return WRITTEN;
    },

    async forgetGrant(language: Language): Promise<ConsentWrite> {
      if (!recordsAvailable()) return STORAGE_UNAVAILABLE;
      await deleteRecord(await recognitionDatabase(), CONSENT_STORE, language);
      return WRITTEN;
    },
  };
}

export { createModelConsentStore };
