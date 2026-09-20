import { describe, expect, it } from 'vitest';
import { err, ok, type Result } from '$lib/shared/result';
import { JAPANESE_OCR_MODEL } from '../domain/model-footprint';
import type { ModelStorageReport } from '../domain/model-cache';
import type { PartialReport } from '../domain/model-partial';
import type { ModelStorage, ModelStorageError } from '../domain/model-storage';
import type { PartialDownloads, PartialError } from '../domain/partial-downloads';
import { readModelStorage } from './read-model-storage';

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

const MODEL = 'DigitalLarynx/manga-ocr-onnx';

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

function deps(options: {
  readonly measured?: Result<ModelStorageReport, ModelStorageError>;
  readonly partial?: Result<PartialReport, PartialError>;
  readonly discarded?: Result<PartialReport, PartialError>;
  readonly space?: { usage: number; quota: number } | null;
  readonly persisted?: boolean;
}) {
  const discards: string[] = [];

  const storage: ModelStorage = {
    measure: () => Promise.resolve(options.measured ?? ok(STORED)),
    remove: () => Promise.resolve(ok(STORED)),
  };

  const partials: PartialDownloads = {
    measure: () => Promise.resolve(options.partial ?? ok(NOTHING_PARTIAL)),
    discard: (modelId: string) => {
      discards.push(modelId);
      return Promise.resolve(options.discarded ?? ok(NOTHING_PARTIAL));
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
    const snapshot = await readModelStorage(
      deps({ space: { usage: 400_000_000, quota: 2_000_000_000 }, persisted: true }),
      MODEL,
    );

    if (!snapshot.ok) throw new Error('The storage could not be read');
    expect(snapshot.value.report).toEqual(STORED);
    expect(snapshot.value.usage).toBe(400_000_000);
    expect(snapshot.value.quota).toBe(2_000_000_000);
    expect(snapshot.value.persisted).toBe(true);
  });

  it('reports the bytes of a part-downloaded file beside the cached ones', async () => {
    const half: PartialReport = { modelId: MODEL, files: 1, bytes: 62_914_560 };
    const world = deps({ measured: ok(HALF_STORED), partial: ok(half) });
    const snapshot = await readModelStorage(world, MODEL);

    if (!snapshot.ok) throw new Error('The storage could not be read');
    expect(snapshot.value.partial).toEqual(half);
    expect(world.discards).toEqual([]);
  });

  it('discards a part-downloaded file the cache already holds in full', async () => {
    const stale: PartialReport = { modelId: MODEL, files: 1, bytes: 117_445_718 };
    const world = deps({ partial: ok(stale) });
    const snapshot = await readModelStorage(world, MODEL);

    if (!snapshot.ok) throw new Error('The storage could not be read');
    expect(world.discards).toEqual([MODEL]);
    expect(snapshot.value.partial).toEqual(NOTHING_PARTIAL);
  });

  it('keeps reporting a stale part-downloaded file it failed to discard', async () => {
    const stale: PartialReport = { modelId: MODEL, files: 1, bytes: 117_445_718 };
    const world = deps({
      partial: ok(stale),
      discarded: err({ kind: 'partials-unavailable' as const }),
    });

    const snapshot = await readModelStorage(world, MODEL);

    if (!snapshot.ok) throw new Error('The storage could not be read');
    expect(snapshot.value.partial).toEqual(stale);
  });

  it('measures what the origin holds after the stale part-file was swept, not before', async () => {
    const stale: PartialReport = { modelId: MODEL, files: 1, bytes: 117_445_718 };
    const order: string[] = [];
    const world = deps({ partial: ok(stale) });
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
    const snapshot = await readModelStorage(
      deps({ partial: err({ kind: 'partials-unavailable' as const }) }),
      MODEL,
    );

    if (!snapshot.ok) throw new Error('The storage could not be read');
    expect(snapshot.value.partial).toBeNull();
  });

  it('reports the model even when the browser refuses an estimate', async () => {
    const snapshot = await readModelStorage(deps({ space: null }), MODEL);

    if (!snapshot.ok) throw new Error('The storage could not be read');
    expect(snapshot.value.report).toEqual(STORED);
    expect(snapshot.value.usage).toBeNull();
    expect(snapshot.value.quota).toBeNull();
  });

  it('fails without asking for an estimate when the cache cannot be read', async () => {
    let asked = 0;
    const failing = {
      ...deps({ measured: err({ kind: 'cache-unavailable' as const }) }),
      estimate: () => {
        asked += 1;
        return Promise.resolve(null);
      },
    };

    const snapshot = await readModelStorage(failing, MODEL);
    expect(snapshot.ok).toBe(false);
    expect(asked).toBe(0);
  });
});
