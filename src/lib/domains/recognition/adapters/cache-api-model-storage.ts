import { describeCause } from '$lib/shared/cause';
import { err, ok, type Result } from '$lib/shared/result';
import {
  entriesOfModel,
  reportOf,
  type CacheEntry,
  type ModelStorageReport,
} from '../domain/model-cache';
import type { ModelStorage, ModelStorageError } from '../domain/model-storage';

const WEIGHT_CACHE = 'transformers-cache';

const HASH_CACHE = 'experimental_transformers-hash-cache';

const CACHE_NAMES: readonly string[] = [WEIGHT_CACHE, HASH_CACHE];

function cachesAvailable(): boolean {
  return typeof caches !== 'undefined';
}

function unavailable(): Result<never, ModelStorageError> {
  return err({ kind: 'cache-unavailable' });
}

function failed(cause: unknown): Result<never, ModelStorageError> {
  return err({ kind: 'cache-failed', cause: describeCause(cause) });
}

function sizeOf(response: Response | undefined): number | null {
  if (response === undefined) return null;

  const declared = response.headers.get('content-length');
  if (declared === null) return null;

  const bytes = Number.parseInt(declared, 10);
  return Number.isFinite(bytes) ? bytes : null;
}

async function openIfPresent(name: string): Promise<Cache | null> {
  return (await caches.has(name)) ? await caches.open(name) : null;
}

async function entriesIn(cache: Cache): Promise<readonly CacheEntry[]> {
  const requests = await cache.keys();
  return await Promise.all(
    requests.map(async (request) => ({
      url: request.url,
      bytes: sizeOf(await cache.match(request)),
    })),
  );
}

async function everyEntry(): Promise<readonly CacheEntry[]> {
  const perCache = await Promise.all(
    CACHE_NAMES.map(async (name) => {
      const cache = await openIfPresent(name);
      return cache === null ? [] : await entriesIn(cache);
    }),
  );

  return perCache.flat();
}

export function createModelStorage(): ModelStorage {
  return {
    async measure(modelId: string): Promise<Result<ModelStorageReport, ModelStorageError>> {
      if (!cachesAvailable()) return unavailable();
      try {
        const report = reportOf(await everyEntry(), modelId);
        return ok(report);
      } catch (cause) {
        return failed(cause);
      }
    },

    async remove(modelId: string): Promise<Result<ModelStorageReport, ModelStorageError>> {
      if (!cachesAvailable()) return unavailable();
      try {
        const removed: CacheEntry[] = [];

        for (const name of CACHE_NAMES) {
          const cache = await openIfPresent(name);
          if (cache === null) continue;

          const mine = entriesOfModel(await entriesIn(cache), modelId);
          for (const entry of mine) {
            if (await cache.delete(entry.url)) removed.push(entry);
          }
        }

        const report = reportOf(removed, modelId);
        return ok(report);
      } catch (cause) {
        return failed(cause);
      }
    },
  };
}
