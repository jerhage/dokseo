import { describe, expect, it } from 'vitest';
import {
  DECODER_PRECISION,
  ENCODER_PRECISION,
  REQUIRED_WEIGHTS,
  weightsAmong,
  weightsFile,
} from './model-weights';

const REPO = 'https://huggingface.co/DigitalLarynx/manga-ocr-onnx/resolve/main';

describe('weightsFile', () => {
  it('suffixes a quantized session, which is what the loader asks the host for', () => {
    expect(weightsFile('encoder_model', ENCODER_PRECISION)).toBe(
      'onnx/encoder_model_quantized.onnx',
    );
  });

  it('leaves a full-precision session unsuffixed', () => {
    expect(weightsFile('decoder_model_merged', DECODER_PRECISION)).toBe(
      'onnx/decoder_model_merged.onnx',
    );
  });
});

describe('weightsAmong', () => {
  it('finds both weight files the engine needs to run', () => {
    const held = weightsAmong([
      `${REPO}/config.json`,
      `${REPO}/onnx/encoder_model_quantized.onnx`,
      `${REPO}/onnx/decoder_model_merged.onnx`,
    ]);

    expect(held).toEqual(REQUIRED_WEIGHTS);
  });

  it('ignores the unsuffixed encoder, which is probed for its size and never fetched', () => {
    expect(weightsAmong([`${REPO}/onnx/encoder_model.onnx`])).toEqual([]);
  });

  it('finds nothing among the configuration files alone', () => {
    expect(weightsAmong([`${REPO}/config.json`, `${REPO}/tokenizer.json`])).toEqual([]);
  });
});
