import { describe, expect, it } from 'vitest';
import { belongsToModel, entriesOfModel, isPartlyStored, isStored, reportOf } from './model-cache';
import type { CacheEntry } from './model-cache';
import { JAPANESE_OCR_MODEL } from './model-footprint';

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

const MODEL = JAPANESE_OCR_MODEL.modelId;

function weights(file: string, bytes: number | null): CacheEntry {
  return { url: `https://huggingface.co/${MODEL}/resolve/main/${file}`, bytes };
}

describe('belongsToModel', () => {
  it('claims an entry whose url carries the model id as a whole path segment', () => {
    expect(belongsToModel(`https://huggingface.co/${MODEL}/resolve/main/config.json`, MODEL)).toBe(
      true,
    );
  });

  it('rejects a model whose id merely starts with the same characters', () => {
    const other = `https://huggingface.co/${MODEL}-large/resolve/main/config.json`;
    expect(belongsToModel(other, MODEL)).toBe(false);
  });

  it('rejects the onnx runtime, which no model owns', () => {
    const runtime = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd.wasm';
    expect(belongsToModel(runtime, MODEL)).toBe(false);
  });

  it('rejects another publisher who used the same model name', () => {
    const other = 'https://huggingface.co/someone/manga-ocr-onnx/resolve/main/config.json';
    expect(belongsToModel(other, MODEL)).toBe(false);
  });
});

describe('entriesOfModel', () => {
  it('keeps only the entries belonging to the model asked for', () => {
    const entries = [
      weights('config.json', 1_000),
      { url: 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.wasm', bytes: 26_000_000 },
      { url: 'https://huggingface.co/another/model/resolve/main/config.json', bytes: 2_000 },
    ];

    expect(entriesOfModel(entries, MODEL)).toEqual([weights('config.json', 1_000)]);
  });
});

describe('reportOf', () => {
  it('sums the bytes of every entry the model owns', () => {
    const report = reportOf(
      [
        weights('onnx/encoder_model_quantized.onnx', 87_007_436),
        weights('onnx/decoder_model_merged_quantized.onnx', 29_643_116),
        { url: 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.wasm', bytes: 26_861_777 },
      ],
      MODEL,
    );

    expect(report).toEqual({
      modelId: MODEL,
      files: 2,
      bytes: 116_650_552,
      unsized: 0,
      required: REQUIRED_WEIGHTS,
      weights: REQUIRED_WEIGHTS,
    });
  });

  it('counts an entry of unknown size rather than guessing its bytes', () => {
    const report = reportOf([weights('tokenizer.json', null), weights('config.json', 900)], MODEL);

    expect(report.files).toBe(2);
    expect(report.bytes).toBe(900);
    expect(report.unsized).toBe(1);
  });

  it('reports nothing stored when no entry belongs to the model', () => {
    const report = reportOf([{ url: 'https://example.test/other', bytes: 10 }], MODEL);

    expect(report).toEqual({
      modelId: MODEL,
      files: 0,
      bytes: 0,
      unsized: 0,
      required: REQUIRED_WEIGHTS,
      weights: [],
    });
    expect(isStored(report)).toBe(false);
  });
});

describe('isStored', () => {
  const configs = [
    weights('config.json', 1_200),
    weights('generation_config.json', 300),
    weights('preprocessor_config.json', 400),
    weights('tokenizer.json', 380_000),
    weights('tokenizer_config.json', 500),
  ];

  it('refuses to call a model stored when only its configuration is cached', () => {
    const report = reportOf(configs, MODEL);

    expect(isStored(report)).toBe(false);
    expect(isPartlyStored(report)).toBe(true);
  });

  it('refuses to call a model stored when one of its two weight files is missing', () => {
    const report = reportOf(
      [...configs, weights('onnx/encoder_model_quantized.onnx', 86_967_767)],
      MODEL,
    );

    expect(isStored(report)).toBe(false);
    expect(isPartlyStored(report)).toBe(true);
  });

  it('calls a model stored once both weight files the engine opens are cached', () => {
    const report = reportOf(
      [
        ...configs,
        weights('onnx/encoder_model_quantized.onnx', 87_007_436),
        weights('onnx/decoder_model_merged_quantized.onnx', 29_643_116),
      ],
      MODEL,
    );

    expect(isStored(report)).toBe(true);
    expect(isPartlyStored(report)).toBe(false);
  });

  it('ignores the unsuffixed encoder the loader probes but never downloads', () => {
    const report = reportOf(
      [
        ...configs,
        weights('onnx/encoder_model.onnx', 343_377_067),
        weights('onnx/decoder_model_merged_quantized.onnx', 29_643_116),
      ],
      MODEL,
    );

    expect(isStored(report)).toBe(false);
    expect(report.weights).toEqual(['onnx/decoder_model_merged_quantized.onnx']);
  });

  it('calls nothing part-stored when the cache holds no file of the model', () => {
    expect(isPartlyStored(reportOf([], MODEL))).toBe(false);
  });
});
