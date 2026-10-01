import { cachedFiles, isAvailable as cachesAvailable } from '$lib/platform/cache/usage';
import { isAvailable as filesAvailable } from '$lib/platform/opfs/directory';
import { storedFiles } from '$lib/platform/opfs/usage';
import type { OriginStores, OriginSurvey } from '../domain/origin-stores';

function createOriginStores(): OriginStores {
  return {
    async survey(): Promise<OriginSurvey> {
      return {
        cached: cachesAvailable() ? await cachedFiles() : null,
        files: filesAvailable() ? await storedFiles() : null,
      };
    },
  };
}

export { createOriginStores };
