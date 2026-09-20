import { describe, expect, it } from 'vitest';
import {
  isPartlyDownloaded,
  partialName,
  partialReportOf,
  partialsOfModel,
  resumesModelWeights,
  urlOfPartial,
  type PartialFile,
} from './model-partial';

const MODEL = 'DigitalLarynx/manga-ocr-onnx';

const REPO = `https://huggingface.co/${MODEL}/resolve/main`;

const WEIGHTS = `${REPO}/onnx/encoder_model_quantized.onnx`;

describe('partialName', () => {
  it('names a part-download with a flat name no directory can be read into', () => {
    const name = partialName(WEIGHTS);

    expect(name).not.toContain('/');
    expect(name).not.toContain('\\');
  });

  it('carries the url back out of the name it stored', () => {
    expect(urlOfPartial(partialName(WEIGHTS))).toBe(WEIGHTS);
  });

  it('returns the name unchanged when it is not one it wrote', () => {
    expect(urlOfPartial('not-a-url-%')).toBe('not-a-url-%');
  });
});

describe('resumesModelWeights', () => {
  it('resumes a weights file belonging to the model being loaded', () => {
    expect(resumesModelWeights({ url: WEIGHTS, partial: false }, MODEL)).toBe(true);
  });

  it('leaves a ranged request alone, because that is the size probe', () => {
    expect(resumesModelWeights({ url: WEIGHTS, partial: true }, MODEL)).toBe(false);
  });

  it('leaves a configuration file alone', () => {
    expect(resumesModelWeights({ url: `${REPO}/tokenizer.json`, partial: false }, MODEL)).toBe(
      false,
    );
  });

  it('leaves the runtime binary alone, because no model owns it', () => {
    const runtime = 'https://cdn.example/ort-wasm-simd-threaded.jsep.wasm';
    expect(resumesModelWeights({ url: runtime, partial: false }, MODEL)).toBe(false);
  });

  it('leaves another model of the same prefix alone', () => {
    const other = `https://huggingface.co/${MODEL}-large/resolve/main/onnx/encoder_model.onnx`;
    expect(resumesModelWeights({ url: other, partial: false }, MODEL)).toBe(false);
  });
});

describe('partialReportOf', () => {
  const held: readonly PartialFile[] = [
    { url: WEIGHTS, bytes: 62_000_000 },
    { url: `${REPO}/onnx/decoder_model_merged.onnx`, bytes: 8_000_000 },
    { url: `https://huggingface.co/${MODEL}-large/resolve/main/onnx/x.onnx`, bytes: 5 },
  ];

  it('counts only the files the model owns', () => {
    expect(partialsOfModel(held, MODEL)).toHaveLength(2);
  });

  it('sums the bytes a half-finished download occupies', () => {
    expect(partialReportOf(held, MODEL)).toEqual({
      modelId: MODEL,
      files: 2,
      bytes: 70_000_000,
    });
  });

  it('reports nothing part-downloaded when no file is held', () => {
    expect(isPartlyDownloaded(partialReportOf([], MODEL))).toBe(false);
  });

  it('reports nothing part-downloaded when the store could not be read', () => {
    expect(isPartlyDownloaded(null)).toBe(false);
  });
});
