import { cachedFiles, isAvailable, removeCached } from '$lib/platform/cache/usage';
import { entriesOfModel, reportOf } from '../../domain/model/model-cache';
import type { ModelCacheRead, ModelStorage } from '../../domain/model/model-storage';

const CACHE_UNAVAILABLE: ModelCacheRead = { kind: 'cache-unavailable' };

function createModelStorage(): ModelStorage {
  return {
    async measure(modelId: string): Promise<ModelCacheRead> {
      if (!isAvailable()) return CACHE_UNAVAILABLE;
      const files = await cachedFiles();
      return { kind: 'success', report: reportOf(files, modelId) };
    },

    async remove(modelId: string): Promise<ModelCacheRead> {
      if (!isAvailable()) return CACHE_UNAVAILABLE;
      const mine = entriesOfModel(await cachedFiles(), modelId);
      const gone = await removeCached(mine.map((entry) => entry.url));
      const report = reportOf(
        mine.filter((entry) => gone.includes(entry.url)),
        modelId,
      );
      return { kind: 'success', report };
    },
  };
}

export { createModelStorage };
