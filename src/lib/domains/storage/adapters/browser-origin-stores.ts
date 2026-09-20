import { cachedFiles, isAvailable as cachesAvailable } from '$lib/platform/cache/usage';
import { isAvailable as filesAvailable } from '$lib/platform/opfs/directory';
import { storedFiles } from '$lib/platform/opfs/usage';
import { describeCause } from '$lib/shared/cause';
import { err, ok, type Result } from '$lib/shared/result';
import type { OriginStores, OriginStoresError, OriginSurvey } from '../domain/origin-stores';

export function createOriginStores(): OriginStores {
  return {
    async survey(): Promise<Result<OriginSurvey, OriginStoresError>> {
      try {
        const survey: OriginSurvey = {
          cached: cachesAvailable() ? await cachedFiles() : null,
          files: filesAvailable() ? await storedFiles() : null,
        };
        return ok(survey);
      } catch (cause) {
        return err({ kind: 'survey-failed', cause: describeCause(cause) });
      }
    },
  };
}
