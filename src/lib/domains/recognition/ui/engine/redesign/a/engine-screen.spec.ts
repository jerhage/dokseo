import { describe, expect, it } from 'vitest';
import { JAPANESE_OCR_MODEL } from '../../../../domain/model/model-footprint';
import { engineStatus, OCR_ENGINES } from '../../../../domain/engine/ocr-engine';
import type { EngineState } from '../../../../domain/engine/ocr-engine';
import type { ModelStorageSnapshot } from '../../../../use-cases/model/read-model-storage';
import {
  activeDevice,
  activeEngine,
  engineActionOf,
  loadPercent,
  modelFootnote,
  removalMb,
  statusVariant,
  UNBUILT_ENGINES,
  weightsFigure,
} from './engine-screen';

const IDLE_ENGINE: EngineState = {
  stored: false,
  opening: false,
  load: null,
  session: null,
  failure: null,
  paused: false,
  cancelled: false,
  partlyDownloaded: false,
};

function snapshot(bytes: number): ModelStorageSnapshot {
  return {
    report: {
      modelId: JAPANESE_OCR_MODEL.modelId,
      files: 7,
      bytes,
      unsized: 0,
      required: [],
      weights: [],
    },
    partial: null,
    usage: null,
    quota: null,
    persisted: true,
  };
}

describe('engineActionOf', () => {
  const base = { loading: false, stored: false, resumable: false, confirmingRemoval: false };

  it('offers a download when nothing is stored and nothing can be resumed', () => {
    expect(engineActionOf(base).kind).toBe('download');
  });

  it('offers a resume when part of the weights is here', () => {
    expect(engineActionOf({ ...base, resumable: true }).kind).toBe('resume');
  });

  it('offers nothing while a load runs and the weights are not stored', () => {
    expect(engineActionOf({ ...base, loading: true }).kind).toBe('none');
    expect(engineActionOf({ ...base, loading: true, resumable: true }).kind).toBe('none');
  });

  it('offers the delete even while stored weights are being opened', () => {
    expect(engineActionOf({ ...base, stored: true }).kind).toBe('delete');
    expect(engineActionOf({ ...base, stored: true, loading: true }).kind).toBe('delete');
  });

  it('hides the delete while its confirmation is asked', () => {
    expect(engineActionOf({ ...base, stored: true, confirmingRemoval: true }).kind).toBe('none');
  });
});

describe('statusVariant', () => {
  it('gives each tone its own badge colour', () => {
    expect(statusVariant('ready')).toBe('success');
    expect(statusVariant('busy')).toBe('warning');
    expect(statusVariant('quiet')).toBe('neutral');
    expect(statusVariant('bad')).toBe('danger');
  });
});

describe('loadPercent', () => {
  it('reports zero before the first progress event', () => {
    expect(loadPercent(null)).toBe(0);
  });

  it('rounds the fraction to a whole percent', () => {
    expect(loadPercent({ fraction: 0.426, source: 'network', loadedBytes: 1, totalBytes: 2 })).toBe(
      43,
    );
  });
});

describe('the model rows', () => {
  it('names the weights in megabytes', () => {
    expect(weightsFigure(JAPANESE_OCR_MODEL)).toBe('117 MB of weights');
  });

  it('lists the languages a model reads before its note', () => {
    expect(modelFootnote(JAPANESE_OCR_MODEL)).toBe(`Japanese · ${JAPANESE_OCR_MODEL.note}`);
  });
});

describe('removalMb', () => {
  it('quotes the published download while nothing has been measured', () => {
    expect(removalMb(null, JAPANESE_OCR_MODEL)).toBe(123);
  });

  it('quotes the measured bytes once the storage is read', () => {
    expect(removalMb(snapshot(204_600_000), JAPANESE_OCR_MODEL)).toBe(205);
  });
});

describe('the aside summary', () => {
  it('names no engine when no model is chosen', () => {
    expect(activeEngine(null)).toBe('None');
  });

  it('names the on-device engine and the model runtime', () => {
    expect(activeEngine(JAPANESE_OCR_MODEL)).toBe(`On-device · ${JAPANESE_OCR_MODEL.engine}`);
  });

  it('gives the status word until a session is open, then the device', () => {
    const idle = engineStatus(IDLE_ENGINE);
    const session = { modelId: JAPANESE_OCR_MODEL.modelId, device: 'webgpu', fellBackFrom: null };

    expect(activeDevice(null, idle)).toBe('Not downloaded');
    expect(activeDevice({ ...session, device: 'webgpu' }, idle)).toBe('running on the GPU');
    expect(activeDevice({ ...session, device: 'wasm' }, idle)).toBe('running on the CPU');
  });
});

describe('UNBUILT_ENGINES', () => {
  it('holds every engine that is not installed, in order', () => {
    expect(UNBUILT_ENGINES.map((engine) => engine.id)).toEqual(['ocr-server', 'openai-endpoint']);
    expect(UNBUILT_ENGINES).toHaveLength(OCR_ENGINES.length - 1);
  });
});
