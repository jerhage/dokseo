import { describe, expect, it } from 'vitest';
import {
  chosenModel,
  downloadMb,
  engineName,
  knownModel,
  megabytes,
  modelFootprint,
  modelsFor,
  onDiskMb,
  type ModelFootprint,
} from './model-footprint';

function japanese(): ModelFootprint {
  const footprint = modelFootprint('ja');
  if (footprint === null) throw new Error('Japanese has a model to download');
  return footprint;
}

describe('modelFootprint', () => {
  it('reports about 211 MB over the wire for Japanese', () => {
    expect(downloadMb(japanese())).toBe(211);
  });

  it('reports about 231 MB on disk for Japanese, 20 MB above the download', () => {
    expect(onDiskMb(japanese())).toBe(231);
    expect(onDiskMb(japanese()) - downloadMb(japanese())).toBe(20);
  });

  it('charges the weights the same either way and only unpacks the runtime', () => {
    const footprint = japanese();
    expect(megabytes(footprint.weightsBytes)).toBe(204);
    expect(megabytes(footprint.runtimeDownloadBytes, 1)).toBe(6.6);
    expect(megabytes(footprint.runtimeOnDiskBytes)).toBe(27);
  });

  it('rounds once from the exact bytes rather than summing rounded figures', () => {
    const footprint: ModelFootprint = {
      modelId: 'an/exact-rounding-check',
      engine: 'exact-rounding-check',
      label: 'exact rounding check',
      language: 'ja',
      note: 'A fixture, not a model.',
      weightsBytes: 1_600_000,
      runtimeDownloadBytes: 1_600_000,
      runtimeOnDiskBytes: 1_600_000,
    };

    const summed = megabytes(footprint.weightsBytes) + megabytes(footprint.runtimeOnDiskBytes);
    expect(summed).toBe(4);
    expect(onDiskMb(footprint)).toBe(3);
    expect(downloadMb(footprint)).toBe(3);
  });

  it('names the model the bytes were measured from, so the two cannot drift apart', () => {
    expect(japanese().modelId).toBe('DigitalLarynx/manga-ocr-onnx');
  });

  it('reports no footprint for a language whose model has not been chosen', () => {
    expect(modelFootprint('ko')).toBeNull();
  });
});

describe('engineName', () => {
  it('names the engine of a model it knows', () => {
    expect(engineName('DigitalLarynx/manga-ocr-onnx')).toBe('manga-ocr');
  });

  it('falls back to the raw model id of a model it does not know', () => {
    expect(engineName('someone/a-model-we-have-not-measured')).toBe(
      'someone/a-model-we-have-not-measured',
    );
  });
});

describe('modelsFor', () => {
  it('offers the verified Japanese model and nothing unverified beside it', () => {
    expect(modelsFor('ja').map((model) => model.modelId)).toEqual(['DigitalLarynx/manga-ocr-onnx']);
  });

  it('offers nothing for a language whose model has not been chosen', () => {
    expect(modelsFor('ko')).toEqual([]);
  });

  it('agrees with the footprint about which language each model reads', () => {
    for (const model of modelsFor('ja')) expect(model.language).toBe('ja');
    expect(japanese().language).toBe('ja');
  });
});

describe('chosenModel', () => {
  it('returns the model the reader picked', () => {
    expect(chosenModel('ja', 'DigitalLarynx/manga-ocr-onnx')).toEqual(japanese());
  });

  it('falls back to the first offered model when nothing was picked', () => {
    expect(chosenModel('ja', null)).toEqual(japanese());
  });

  it('falls back rather than honouring a model that is no longer offered', () => {
    expect(chosenModel('ja', 'dnouv/manga-ocr')).toEqual(japanese());
  });

  it('returns nothing for a language with no model at all', () => {
    expect(chosenModel('ko', 'DigitalLarynx/manga-ocr-onnx')).toBeNull();
  });
});

describe('knownModel', () => {
  it('finds a model by its id', () => {
    expect(knownModel('DigitalLarynx/manga-ocr-onnx')).toEqual(japanese());
  });

  it('returns nothing for a model nobody measured', () => {
    expect(knownModel('dnouv/manga-ocr')).toBeNull();
  });
});
