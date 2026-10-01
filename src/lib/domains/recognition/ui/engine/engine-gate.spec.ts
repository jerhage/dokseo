import { describe, expect, it } from 'vitest';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import type { ReadState } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { ModelFootprint } from '../../domain/model/model-footprint';
import type { ReadModelConsentResult } from '../../use-cases/model/read-model-consent';
import type {
  ModelStorageSnapshot,
  ReadModelStorageResult,
} from '../../use-cases/model/read-model-storage';
import { NOT_READ, consentStep, readingFor, readsSettled, warmStep } from './engine-gate';
import type { EngineGateRead, EngineReading } from './engine-gate';

const GRANTED: ReadModelConsentResult = { kind: 'success', decision: 'granted' };

const UNDECIDED: ReadModelConsentResult = { kind: 'success', decision: 'undecided' };

const SNAPSHOT: ModelStorageSnapshot = {
  report: {
    modelId: JAPANESE_OCR_MODEL.modelId,
    files: 0,
    bytes: 0,
    unsized: 0,
    required: JAPANESE_OCR_MODEL.weightFiles,
    weights: [],
  },
  partial: null,
  usage: null,
  quota: null,
  persisted: false,
};

function reading(
  chosen: ReadState<ModelFootprint | null>,
  consent: ReadState<ReadModelConsentResult> = readReady(UNDECIDED),
  storage: ReadState<ReadModelStorageResult> = readReady({ kind: 'success', snapshot: SNAPSHOT }),
): EngineReading {
  return { chosen, consent, storage, reload: () => undefined };
}

const MODEL = readReady(JAPANESE_OCR_MODEL);

describe('readingFor', () => {
  it('hands on the reads of the language asked for', () => {
    const read: EngineGateRead = { ...reading(MODEL), language: 'ja' };

    expect(readingFor(read, 'ja')).toBe(read);
  });

  it('answers nothing read for another language or no reads at all', () => {
    const read: EngineGateRead = { ...reading(MODEL), language: 'ja' };

    expect(readingFor(read, 'ko')).toBe(NOT_READ);
    expect(readingFor(undefined, 'ja')).toBe(NOT_READ);
  });
});

describe('readsSettled', () => {
  it('waits for the setup and the consent', () => {
    expect(readsSettled(reading(LOADING))).toBe(false);
    expect(readsSettled(reading(MODEL, LOADING))).toBe(false);
  });

  it('waits for the storage of a chosen model', () => {
    expect(readsSettled(reading(MODEL, readReady(GRANTED), LOADING))).toBe(false);
    expect(readsSettled(reading(MODEL))).toBe(true);
  });

  it('settles without the storage when no model is chosen or the setup failed', () => {
    expect(readsSettled(reading(readReady(null), readReady(GRANTED), LOADING))).toBe(true);
    expect(readsSettled(reading(readFailed('gone'), readReady(GRANTED), LOADING))).toBe(true);
  });

  it('settles on a failed consent read', () => {
    expect(readsSettled(reading(MODEL, readFailed('gone')))).toBe(true);
  });
});

describe('consentStep', () => {
  it('waits while the setup or the consent is read', () => {
    expect(consentStep(reading(LOADING))).toEqual({ kind: 'waiting' });
    expect(consentStep(reading(MODEL, LOADING))).toEqual({ kind: 'waiting' });
  });

  it('fails with the message of a failed setup or consent read', () => {
    expect(consentStep(reading(readFailed('no setup')))).toEqual({
      kind: 'failed',
      message: 'no setup',
    });
    expect(consentStep(reading(MODEL, readFailed('no consent')))).toEqual({
      kind: 'failed',
      message: 'no consent',
    });
  });

  it('admits a language with no model to download, whatever the consent read says', () => {
    expect(consentStep(reading(readReady(null), readFailed('no consent')))).toEqual({
      kind: 'nothing-to-download',
    });
  });

  it('admits a stored grant', () => {
    expect(consentStep(reading(MODEL, readReady(GRANTED)))).toEqual({ kind: 'granted' });
  });

  it('asks about the chosen model when nothing was granted or the store is blocked', () => {
    expect(consentStep(reading(MODEL, readReady(UNDECIDED)))).toEqual({
      kind: 'undecided',
      footprint: JAPANESE_OCR_MODEL,
    });
    expect(consentStep(reading(MODEL, readReady(STORAGE_UNAVAILABLE)))).toEqual({
      kind: 'undecided',
      footprint: JAPANESE_OCR_MODEL,
    });
  });
});

describe('warmStep', () => {
  it('waits while the setup or the storage is read', () => {
    expect(warmStep(reading(LOADING))).toEqual({ kind: 'waiting' });
    expect(warmStep(reading(MODEL, readReady(GRANTED), LOADING))).toEqual({ kind: 'waiting' });
  });

  it('fails with the message of a failed setup or storage read', () => {
    expect(warmStep(reading(readFailed('no setup')))).toEqual({
      kind: 'failed',
      message: 'no setup',
    });
    expect(warmStep(reading(MODEL, readReady(GRANTED), readFailed('no storage')))).toEqual({
      kind: 'failed',
      message: 'no storage',
    });
  });

  it('answers no model for a language with nothing to download', () => {
    expect(warmStep(reading(readReady(null)))).toEqual({ kind: 'no-model' });
  });

  it('hands on what the chosen model occupies, and nothing for a browser with no cache', () => {
    expect(warmStep(reading(MODEL))).toEqual({
      kind: 'read',
      modelId: JAPANESE_OCR_MODEL.modelId,
      snapshot: SNAPSHOT,
    });
    expect(
      warmStep(reading(MODEL, readReady(GRANTED), readReady({ kind: 'cache-unavailable' }))),
    ).toEqual({ kind: 'read', modelId: JAPANESE_OCR_MODEL.modelId, snapshot: null });
  });

  it('reads no consent on the way to the storage', () => {
    let consulted = 0;
    const read: EngineReading = {
      chosen: MODEL,
      get consent() {
        consulted += 1;
        return readReady(GRANTED);
      },
      storage: readReady({ kind: 'success', snapshot: SNAPSHOT }),
      reload: () => undefined,
    };

    warmStep(read);

    expect(consulted).toBe(0);
  });
});
