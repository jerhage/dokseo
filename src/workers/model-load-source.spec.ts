import { describe, expect, it } from 'vitest';
import { watchModelLoadSource } from './model-load-source';

type Env = { fetch: (input: string | URL, init?: unknown) => Promise<unknown> };

const REPO = 'https://huggingface.co/DigitalLarynx/manga-ocr-onnx/resolve/main';

function env(): Env {
  return { fetch: (input: string | URL) => Promise.resolve(String(input)) };
}

function sizeProbe(): { headers: Headers } {
  return { headers: new Headers({ Range: 'bytes=0-0' }) };
}

describe('watchModelLoadSource', () => {
  it('reports a load that fetched nothing as coming from the cache', () => {
    const source = watchModelLoadSource(env());
    expect(source()).toBe('cache');
  });

  it('reports a load as coming from the network once a weights file is fetched', async () => {
    const watched = env();
    const source = watchModelLoadSource(watched);

    await watched.fetch(`${REPO}/onnx/encoder_model_quantized.onnx`);
    expect(source()).toBe('network');
  });

  it('reports a load as coming from the network once the runtime binary is fetched', async () => {
    const watched = env();
    const source = watchModelLoadSource(watched);

    await watched.fetch('https://cdn.example/ort-wasm-simd-threaded.jsep.wasm');
    expect(source()).toBe('network');
  });

  it('reports a load that fetched only configuration as coming from the cache', async () => {
    const watched = env();
    const source = watchModelLoadSource(watched);

    await watched.fetch(`${REPO}/config.json`);
    await watched.fetch(`${REPO}/tokenizer.json`);
    await watched.fetch(`${REPO}/tokenizer_config.json`);
    await watched.fetch(`${REPO}/preprocessor_config.json`);
    await watched.fetch(`${REPO}/generation_config.json`);
    expect(source()).toBe('cache');
  });

  it('reports a load that only measured a weights file as coming from the cache', async () => {
    const watched = env();
    const source = watchModelLoadSource(watched);

    await watched.fetch(`${REPO}/onnx/encoder_model.onnx`, sizeProbe());
    expect(source()).toBe('cache');
  });

  it('keeps reporting the network for the rest of a load the cache then served', async () => {
    const watched = env();
    const source = watchModelLoadSource(watched);

    await watched.fetch(`${REPO}/onnx/encoder_model_quantized.onnx`);
    expect(source()).toBe('network');
    expect(source()).toBe('network');
  });

  it('passes the fetch through to the one it replaced', async () => {
    const watched = env();
    watchModelLoadSource(watched);

    expect(await watched.fetch(`${REPO}/config.json`)).toBe(`${REPO}/config.json`);
  });
});
