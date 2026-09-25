import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '$lib/shared/language';
import { OCR_ENGINES, ON_DEVICE_ENGINE } from '../../../../domain/engine/ocr-engine';
import { JAPANESE_OCR_MODEL } from '../../../../domain/model/model-footprint';
import type { ModelStorageSnapshot } from '../../../../use-cases/model/read-model-storage';
import {
  alreadyHere,
  engineBadge,
  engineLine,
  footprintFacts,
  languageFrom,
  modelHint,
  storedLine,
  verdictVariant,
} from './engine-page';

const SNAPSHOT: ModelStorageSnapshot = {
  report: {
    modelId: JAPANESE_OCR_MODEL.modelId,
    files: 7,
    bytes: 204_600_000,
    unsized: 0,
    required: ['a'],
    weights: ['a'],
  },
  partial: null,
  usage: null,
  quota: null,
  persisted: true,
};

describe('footprintFacts', () => {
  it('quotes the weights, the runtime and the size on disk, in that order', () => {
    expect(footprintFacts(JAPANESE_OCR_MODEL)).toEqual([
      { term: 'Weights download', detail: 'about 117 MB' },
      { term: 'Runtime download', detail: 'about 7 MB' },
      { term: 'On disk', detail: 'about 144 MB' },
    ]);
  });
});

describe('engineLine', () => {
  it('names the engine alone until a session is open', () => {
    expect(engineLine(JAPANESE_OCR_MODEL, null)).toBe('On-device · manga-ocr');
  });

  it('adds the device the session opened on', () => {
    const session = { modelId: JAPANESE_OCR_MODEL.modelId, device: 'wasm', fellBackFrom: null };

    expect(engineLine(JAPANESE_OCR_MODEL, { ...session, device: 'wasm' })).toBe(
      'On-device · manga-ocr · running on the CPU',
    );
  });
});

describe('modelHint', () => {
  it('puts the weights before the languages and the note', () => {
    expect(modelHint(JAPANESE_OCR_MODEL)).toBe(
      `117 MB of weights · Japanese · ${JAPANESE_OCR_MODEL.note}`,
    );
  });
});

describe('verdictVariant', () => {
  it('colours a good trade green and a caveat amber', () => {
    expect(verdictVariant('good')).toBe('success');
    expect(verdictVariant('caveat')).toBe('warning');
  });
});

describe('engineBadge', () => {
  it('marks the built engine in use and every other one not installed', () => {
    expect(engineBadge(ON_DEVICE_ENGINE)).toEqual({ label: 'In use', variant: 'brand' });
    for (const engine of OCR_ENGINES.filter((offered) => !offered.installed)) {
      expect(engineBadge(engine)).toEqual({ label: 'Not installed', variant: 'neutral' });
    }
  });
});

describe('storedLine', () => {
  it('reads until a snapshot or a failure arrives', () => {
    expect(storedLine(null, null)).toEqual({ kind: 'reading', text: 'Reading what is stored…' });
  });

  it('gives the failure when the storage could not be read', () => {
    expect(storedLine(null, 'broken')).toEqual({ kind: 'failed', text: 'broken' });
  });

  it('gives the measured figure once a snapshot arrives, even beside an old failure', () => {
    expect(storedLine(SNAPSHOT, 'broken')).toEqual({ kind: 'measured', text: '205 MB in 7 files' });
  });
});

describe('alreadyHere', () => {
  it('names the part-downloaded megabytes', () => {
    expect(alreadyHere({ modelId: 'm', files: 1, bytes: 50e6 })).toBe('50 MB already here');
  });

  it('says nothing when no byte is kept', () => {
    expect(alreadyHere(null)).toBeNull();
    expect(alreadyHere({ modelId: 'm', files: 0, bytes: 0 })).toBeNull();
  });
});

describe('languageFrom', () => {
  it('returns an offered language by its code', () => {
    expect(languageFrom('ko', LANGUAGES)).toBe('ko');
  });

  it('refuses a value that is not offered', () => {
    expect(languageFrom('ko', ['ja'])).toBeNull();
    expect(languageFrom('fr', LANGUAGES)).toBeNull();
  });
});
