import { describe, expect, it } from 'vitest';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { ModelLoad } from '../../domain/model/model-load';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { ModelStorageSnapshot } from '../../use-cases/model/read-model-storage';
import { engineStateOf, warmthOf } from './engine-warmth';
import type { EngineWarmth } from './engine-warmth';

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

const OPENED_SESSION: RecognizerSession = {
  modelId: 'DigitalLarynx/manga-ocr-onnx',
  device: 'webgpu',
  fellBackFrom: null,
};

const LOAD: ModelLoad = { fraction: 0.4, source: 'network', loadedBytes: 0, totalBytes: 0 };

function snapshot(modelId: string, weights: number, partialBytes: number): ModelStorageSnapshot {
  return {
    report: {
      modelId,
      files: weights,
      bytes: weights * 1_000,
      unsized: 0,
      required: REQUIRED_WEIGHTS,
      weights: REQUIRED_WEIGHTS.slice(0, weights),
    },
    partial: { modelId, files: partialBytes > 0 ? 1 : 0, bytes: partialBytes },
    usage: null,
    quota: null,
    persisted: false,
  };
}

describe('warmthOf', () => {
  const cases: readonly (readonly [string, ModelStorageSnapshot | null, EngineWarmth])[] = [
    ['an unread storage as unchecked', null, { kind: 'unchecked' }],
    [
      'every required weight on disk as stored',
      snapshot('m', REQUIRED_WEIGHTS.length, 0),
      { kind: 'stored' },
    ],
    ['some cached weights as partial', snapshot('m', 1, 0), { kind: 'partial' }],
    ['a part-downloaded file as partial', snapshot('m', 0, 10), { kind: 'partial' }],
    ['nothing on disk as missing', snapshot('m', 0, 0), { kind: 'missing' }],
  ];

  it.each(cases)('reports %s', (_name, storage, warmth) => {
    expect(warmthOf(storage)).toEqual(warmth);
  });
});

describe('engineStateOf', () => {
  const cases: readonly (readonly [EngineWarmth, Partial<ReturnType<typeof engineStateOf>>])[] = [
    [{ kind: 'unchecked' }, {}],
    [{ kind: 'missing' }, {}],
    [{ kind: 'partial' }, { partlyDownloaded: true }],
    [{ kind: 'stored' }, { stored: true }],
    [{ kind: 'opening' }, { stored: true, opening: true }],
    [
      { kind: 'failed', cause: 'gone' },
      { stored: true, failure: 'gone' },
    ],
  ];

  it.each(cases)('maps %o to the engine state the pill reads', (warmth, fields) => {
    expect(engineStateOf(warmth, LOAD, OPENED_SESSION)).toEqual({
      stored: false,
      opening: false,
      load: LOAD,
      session: OPENED_SESSION,
      failure: null,
      paused: false,
      cancelled: false,
      partlyDownloaded: false,
      ...fields,
    });
  });
});
