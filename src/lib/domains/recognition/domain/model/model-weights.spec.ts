import { describe, expect, it } from 'vitest';
import {
  encoderDecoderWeights,
  QUANTIZED_ENCODER_ONLY,
  QUANTIZED_THROUGHOUT,
  weightsAmong,
  weightsFile,
} from './model-weights';

const REPO = 'https://huggingface.co/kimchireader/manga-ocr-onnx-q8/resolve/main';

const QUANTIZED_WEIGHTS = encoderDecoderWeights(QUANTIZED_THROUGHOUT);

describe('weightsFile', () => {
  it('suffixes a quantized session, which is what the loader asks the host for', () => {
    expect(weightsFile('encoder_model', 'q8')).toBe('onnx/encoder_model_quantized.onnx');
  });

  it('leaves a full-precision session unsuffixed', () => {
    expect(weightsFile('decoder_model_merged', 'fp32')).toBe('onnx/decoder_model_merged.onnx');
  });
});

describe('encoderDecoderWeights', () => {
  it('asks for a quantized merged decoder when the decoder is quantized', () => {
    expect(QUANTIZED_WEIGHTS).toEqual([
      'onnx/encoder_model_quantized.onnx',
      'onnx/decoder_model_merged_quantized.onnx',
    ]);
  });

  it('keeps the unsuffixed merged decoder when only the encoder is quantized', () => {
    expect(encoderDecoderWeights(QUANTIZED_ENCODER_ONLY)).toEqual([
      'onnx/encoder_model_quantized.onnx',
      'onnx/decoder_model_merged.onnx',
    ]);
  });
});

describe('weightsAmong', () => {
  it('finds both weight files the engine needs to run', () => {
    const held = weightsAmong(
      [
        `${REPO}/config.json`,
        `${REPO}/onnx/encoder_model_quantized.onnx`,
        `${REPO}/onnx/decoder_model_merged_quantized.onnx`,
      ],
      QUANTIZED_WEIGHTS,
    );

    expect(held).toEqual(QUANTIZED_WEIGHTS);
  });

  it('ignores the unsuffixed encoder, which is probed for its size and never fetched', () => {
    expect(weightsAmong([`${REPO}/onnx/encoder_model.onnx`], QUANTIZED_WEIGHTS)).toEqual([]);
  });

  it('finds nothing among the configuration files alone', () => {
    expect(
      weightsAmong([`${REPO}/config.json`, `${REPO}/tokenizer.json`], QUANTIZED_WEIGHTS),
    ).toEqual([]);
  });
});
