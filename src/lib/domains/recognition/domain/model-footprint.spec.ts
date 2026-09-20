import { describe, expect, it } from 'vitest';
import { megabytes } from '$lib/shared/bytes';
import {
  chosenModel,
  downloadMb,
  engineName,
  knownModel,
  modelFootprint,
  modelsFor,
  onDiskMb,
  reads,
  type ModelFootprint,
} from './model-footprint';

function japanese(): ModelFootprint {
  const footprint = modelFootprint('ja');
  if (footprint === null) throw new Error('Japanese has a model to download');
  return footprint;
}

describe('modelFootprint', () => {
  it('reports about 123 MB over the wire for Japanese', () => {
    expect(downloadMb(japanese())).toBe(123);
  });

  it('reports about 144 MB on disk for Japanese, 21 MB above the download', () => {
    expect(onDiskMb(japanese())).toBe(144);
    expect(onDiskMb(japanese()) - downloadMb(japanese())).toBe(21);
  });

  it('charges the weights the same either way and only unpacks the runtime', () => {
    const footprint = japanese();
    expect(megabytes(footprint.weightsBytes)).toBe(117);
    expect(megabytes(footprint.runtimeDownloadBytes, 1)).toBe(6.6);
    expect(megabytes(footprint.runtimeOnDiskBytes)).toBe(27);
  });

  it('rounds once from the exact bytes rather than summing rounded figures', () => {
    const footprint: ModelFootprint = {
      modelId: 'an/exact-rounding-check',
      engine: 'exact-rounding-check',
      label: 'exact rounding check',
      languages: ['ja'],
      note: 'A fixture, not a model.',
      quality: 'A fixture, not a measurement.',
      precision: null,
      weightFiles: [],
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
    expect(japanese().modelId).toBe('kimchireader/manga-ocr-onnx-q8');
  });

  it('reports the exploratory 13 MB of weights for Korean', () => {
    const korean = modelFootprint('ko');
    expect(korean?.modelId).toBe('PaddlePaddle/korean_PP-OCRv5_mobile_rec_onnx');
    expect(megabytes(korean?.weightsBytes ?? 0)).toBe(13);
  });
});

describe('engineName', () => {
  it('names the engine of a model it knows', () => {
    expect(engineName('kimchireader/manga-ocr-onnx-q8')).toBe('manga-ocr');
  });

  it('falls back to the raw model id of a model it does not know', () => {
    expect(engineName('someone/a-model-we-have-not-measured')).toBe(
      'someone/a-model-we-have-not-measured',
    );
  });
});

describe('modelsFor', () => {
  it('offers the quantized Japanese model first and the full-precision one beside it', () => {
    expect(modelsFor('ja').map((model) => model.modelId)).toEqual([
      'kimchireader/manga-ocr-onnx-q8',
      'DigitalLarynx/manga-ocr-onnx',
    ]);
  });

  it('asks each Japanese model for the merged decoder its own precision names', () => {
    expect(modelsFor('ja').map((model) => model.weightFiles)).toEqual([
      ['onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'],
      ['onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged.onnx'],
    ]);
  });

  it('offers a model to each language it declares and to no other', () => {
    expect(modelsFor('ko').map((model) => model.modelId)).toEqual([
      'PaddlePaddle/korean_PP-OCRv5_mobile_rec_onnx',
    ]);
  });

  it('reads a model declaring both languages as an offer to each of them', () => {
    const both: ModelFootprint = { ...japanese(), languages: ['ja', 'ko'] };
    expect(reads(both, 'ja')).toBe(true);
    expect(reads(both, 'ko')).toBe(true);
  });

  it('agrees with the footprint about which language each model reads', () => {
    for (const model of modelsFor('ja')) expect(model.languages).toContain('ja');
    expect(japanese().languages).toEqual(['ja']);
  });
});

describe('chosenModel', () => {
  it('returns the model the reader picked', () => {
    expect(chosenModel('ja', 'DigitalLarynx/manga-ocr-onnx')?.modelId).toBe(
      'DigitalLarynx/manga-ocr-onnx',
    );
  });

  it('falls back to the first offered model when nothing was picked', () => {
    expect(chosenModel('ja', null)).toEqual(japanese());
  });

  it('falls back rather than honouring a model that is no longer offered', () => {
    expect(chosenModel('ja', 'dnouv/manga-ocr')).toEqual(japanese());
  });

  it('defaults Japanese to the quantized model rather than the one it can be compared with', () => {
    expect(chosenModel('ja', null)?.modelId).toBe('kimchireader/manga-ocr-onnx-q8');
  });

  it('refuses a model that cannot read the language and defaults to one that can', () => {
    expect(chosenModel('ko', 'DigitalLarynx/manga-ocr-onnx')).toEqual(modelFootprint('ko'));
  });
});

describe('knownModel', () => {
  it('finds a model by its id', () => {
    expect(knownModel('kimchireader/manga-ocr-onnx-q8')).toEqual(japanese());
  });

  it('still knows the full-precision model a reader may have picked', () => {
    expect(knownModel('DigitalLarynx/manga-ocr-onnx')?.label).toBe(
      'manga-ocr base, full-precision decoder',
    );
  });

  it('returns nothing for a model nobody measured', () => {
    expect(knownModel('dnouv/manga-ocr')).toBeNull();
  });
});
