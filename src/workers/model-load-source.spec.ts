import { describe, expect, it } from 'vitest';
import { watchModelLoadSource } from './model-load-source';

type Env = { fetch: (input: string | URL, init?: unknown) => Promise<unknown> };

function env(): Env {
  return { fetch: (input: string | URL) => Promise.resolve(String(input)) };
}

describe('watchModelLoadSource', () => {
  it('reports a load that fetched nothing as coming from the cache', () => {
    const source = watchModelLoadSource(env());
    expect(source()).toBe('cache');
  });

  it('reports a load as coming from the network once a file is fetched', async () => {
    const watched = env();
    const source = watchModelLoadSource(watched);

    await watched.fetch('https://huggingface.co/a/model.onnx');
    expect(source()).toBe('network');
  });

  it('keeps reporting the network for the rest of a load the cache then served', async () => {
    const watched = env();
    const source = watchModelLoadSource(watched);

    await watched.fetch('https://huggingface.co/a/model.onnx');
    expect(source()).toBe('network');
    expect(source()).toBe('network');
  });

  it('passes the fetch through to the one it replaced', async () => {
    const watched = env();
    watchModelLoadSource(watched);

    expect(await watched.fetch('https://huggingface.co/a/config.json')).toBe(
      'https://huggingface.co/a/config.json',
    );
  });
});
