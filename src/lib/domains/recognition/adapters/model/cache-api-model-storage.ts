import { cachedFiles, isAvailable, removeCached } from '$lib/platform/cache/usage';
import { describeCause } from '$lib/shared/cause';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { entriesOfModel, reportOf } from '../../domain/model/model-cache';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import type { ModelStorage, ModelStorageError } from '../../domain/model/model-storage';

function unavailable(): Result<never, ModelStorageError> {
  return err({ kind: 'cache-unavailable' });
}

function failed(cause: unknown): Result<never, ModelStorageError> {
  return err({ kind: 'cache-failed', cause: describeCause(cause) });
}

function createModelStorage(): ModelStorage {
  return {
    async measure(modelId: string): Promise<Result<ModelStorageReport, ModelStorageError>> {
      if (!isAvailable()) return unavailable();
      try {
        const report = reportOf(await cachedFiles(), modelId);
        return ok(report);
      } catch (cause) {
        return failed(cause);
      }
    },

    async remove(modelId: string): Promise<Result<ModelStorageReport, ModelStorageError>> {
      if (!isAvailable()) return unavailable();
      try {
        const mine = entriesOfModel(await cachedFiles(), modelId);
        const gone = await removeCached(mine.map((entry) => entry.url));
        const report = reportOf(
          mine.filter((entry) => gone.includes(entry.url)),
          modelId,
        );
        return ok(report);
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}

export { createModelStorage };
