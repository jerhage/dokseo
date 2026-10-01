import { describe, expect, it } from 'vitest';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { ModelStorageReport } from '../../domain/model/model-cache';
import type { PartialReport } from '../../domain/model/model-partial';
import type { ModelCacheRead, ModelStorage } from '../../domain/model/model-storage';
import type { PartialDownloads, PartialsRead } from '../../domain/model/partial-downloads';
import { readModelStorage } from './read-model-storage';
import type { ModelStorageSnapshot, ReadModelStorageResult } from './read-model-storage';

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

const MODEL = JAPANESE_OCR_MODEL.modelId;

const STORED: ModelStorageReport = {
  modelId: MODEL,
  files: 9,
  bytes: 204_413_485,
  unsized: 0,
  required: REQUIRED_WEIGHTS,
  weights: REQUIRED_WEIGHTS,
};

const NOTHING_PARTIAL: PartialReport = { modelId: MODEL, files: 0, bytes: 0 };

const HALF_STORED: ModelStorageReport = {
  modelId: MODEL,
  files: 6,
  bytes: 86_967_767,
  unsized: 0,
  required: REQUIRED_WEIGHTS,
  weights: [REQUIRED_WEIGHTS[0] ?? ''],
};

function cached(report: ModelStorageReport): ModelCacheRead {
  return { kind: 'success', report };
}

function parted(report: PartialReport): PartialsRead {
  return { kind: 'success', report };
}

const NO_PARTIALS: PartialsRead = { kind: 'partials-unavailable' };

function snapshotOf(read: ReadModelStorageResult): ModelStorageSnapshot {
  if (read.kind !== 'success') throw new Error('The storage could not be read');
  return read.snapshot;
}

function deps(options: {
  readonly measured?: ModelCacheRead;
  readonly partial?: PartialsRead;
  readonly discarded?: PartialsRead;
  readonly space?: { usage: number; quota: number } | null;
  readonly persisted?: boolean;
}) {
  const discards: string[] = [];

  const storage: ModelStorage = {
    measure: () => Promise.resolve(options.measured ?? cached(STORED)),
    remove: () => Promise.resolve(cached(STORED)),
  };

  const partials: PartialDownloads = {
    measure: () => Promise.resolve(options.partial ?? parted(NOTHING_PARTIAL)),
    discard: (modelId: string) => {
      discards.push(modelId);
      return Promise.resolve(options.discarded ?? parted(NOTHING_PARTIAL));
    },
  };

  return {
    storage,
    partials,
    discards,
    estimate: () => Promise.resolve(options.space ?? null),
    persisted: () => Promise.resolve(options.persisted ?? false),
  };
}

describe('readModelStorage', () => {
  it('reports what the browser says is stored beside what the model occupies', async () => {
    const snapshot = snapshotOf(
      await readModelStorage(
        deps({ space: { usage: 400_000_000, quota: 2_000_000_000 }, persisted: true }),
        MODEL,
      ),
    );

    expect(snapshot.report).toEqual(STORED);
    expect(snapshot.usage).toBe(400_000_000);
    expect(snapshot.quota).toBe(2_000_000_000);
    expect(snapshot.persisted).toBe(true);
  });

  it('reports the bytes of a part-downloaded file beside the cached ones', async () => {
    const half: PartialReport = { modelId: MODEL, files: 1, bytes: 62_914_560 };
    const world = deps({ measured: cached(HALF_STORED), partial: parted(half) });
    const snapshot = snapshotOf(await readModelStorage(world, MODEL));

    expect(snapshot.partial).toEqual(half);
    expect(world.discards).toEqual([]);
  });

  it('discards a part-downloaded file the cache already holds in full', async () => {
    const stale: PartialReport = { modelId: MODEL, files: 1, bytes: 117_445_718 };
    const world = deps({ partial: parted(stale) });
    const snapshot = snapshotOf(await readModelStorage(world, MODEL));

    expect(world.discards).toEqual([MODEL]);
    expect(snapshot.partial).toEqual(NOTHING_PARTIAL);
  });

  it('keeps reporting a stale part-downloaded file it failed to discard', async () => {
    const stale: PartialReport = { modelId: MODEL, files: 1, bytes: 117_445_718 };
    const world = deps({ partial: parted(stale), discarded: NO_PARTIALS });

    const snapshot = snapshotOf(await readModelStorage(world, MODEL));

    expect(snapshot.partial).toEqual(stale);
  });

  it('measures what the origin holds after the stale part-file was swept, not before', async () => {
    const stale: PartialReport = { modelId: MODEL, files: 1, bytes: 117_445_718 };
    const order: string[] = [];
    const world = deps({ partial: parted(stale) });
    const watched = {
      ...world,
      partials: {
        measure: world.partials.measure,
        discard: (modelId: string) => {
          order.push('discard');
          return world.partials.discard(modelId);
        },
      },
      estimate: () => {
        order.push('estimate');
        return Promise.resolve(null);
      },
    };

    await readModelStorage(watched, MODEL);

    expect(order).toEqual(['discard', 'estimate']);
  });

  it('reports no figure for part-downloads it could not read, rather than zero', async () => {
    const snapshot = snapshotOf(await readModelStorage(deps({ partial: NO_PARTIALS }), MODEL));

    expect(snapshot.partial).toBeNull();
  });

  it('reports the model even when the browser refuses an estimate', async () => {
    const snapshot = snapshotOf(await readModelStorage(deps({ space: null }), MODEL));

    expect(snapshot.report).toEqual(STORED);
    expect(snapshot.usage).toBeNull();
    expect(snapshot.quota).toBeNull();
  });

  it('fails without asking for an estimate when the cache cannot be read', async () => {
    let asked = 0;
    const failing = {
      ...deps({ measured: { kind: 'cache-unavailable' } }),
      estimate: () => {
        asked += 1;
        return Promise.resolve(null);
      },
    };

    const snapshot = await readModelStorage(failing, MODEL);
    expect(snapshot).toEqual({ kind: 'cache-unavailable' });
    expect(asked).toBe(0);
  });
});
