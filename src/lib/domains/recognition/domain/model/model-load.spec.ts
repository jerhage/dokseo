import { describe, expect, it } from 'vitest';
import { downloadsModelPayload, loadVerb } from './model-load';

const REPO = 'https://huggingface.co/DigitalLarynx/manga-ocr-onnx/resolve/main';

describe('downloadsModelPayload', () => {
  it.each([
    { what: 'a whole weights file', url: `${REPO}/onnx/encoder_model_quantized.onnx` },
    { what: 'the runtime binary', url: 'https://cdn.example/ort-wasm-simd-threaded.jsep.wasm' },
  ])('counts $what', ({ url }) => {
    expect(downloadsModelPayload({ url, partial: false })).toBe(true);
  });

  it('rejects a configuration file', () => {
    expect(downloadsModelPayload({ url: `${REPO}/config.json`, partial: false })).toBe(false);
    expect(downloadsModelPayload({ url: `${REPO}/tokenizer.json`, partial: false })).toBe(false);
    expect(downloadsModelPayload({ url: `${REPO}/preprocessor_config.json`, partial: false })).toBe(
      false,
    );
  });

  it('rejects the range request that only reads a weights file size', () => {
    expect(downloadsModelPayload({ url: `${REPO}/onnx/encoder_model.onnx`, partial: true })).toBe(
      false,
    );
  });

  it('ignores a query string when it reads the extension', () => {
    expect(
      downloadsModelPayload({
        url: `${REPO}/onnx/decoder_model_merged.onnx?download=true`,
        partial: false,
      }),
    ).toBe(true);
  });
});

describe('loadVerb', () => {
  it('names a cached load neutrally', () => {
    expect(loadVerb('cache')).toBe('Loading');
  });

  it('names a networked load a download', () => {
    expect(loadVerb('network')).toBe('Downloading');
  });
});
