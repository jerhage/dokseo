import { describe, expect, it } from 'vitest';
import { installModelFetch } from './model-fetch';
import type { PartAppend, PartialFiles } from './resumable-fetch';

const MODEL = 'DigitalLarynx/manga-ocr-onnx';

const REPO = `https://huggingface.co/${MODEL}/resolve/main`;

const BODY = Uint8Array.from({ length: 10 }, (_, at) => at);

type Env = { fetch: (input: string | URL, init?: unknown) => Promise<unknown> };

function held() {
  const files = new Map<string, Uint8Array<ArrayBuffer>>();

  const store: PartialFiles = {
    sizeOf: (key: string) => Promise.resolve(files.get(key)?.byteLength ?? 0),
    fileOf: (key: string) => {
      const found = files.get(key);
      return Promise.resolve(found === undefined ? null : new Blob([found]));
    },
    openAppend: (key: string, from: number): Promise<PartAppend> => {
      let kept = (files.get(key) ?? new Uint8Array(0)).slice(0, from);
      files.set(key, kept);
      return Promise.resolve({
        write(bytes: Uint8Array): void {
          const grown = new Uint8Array(kept.byteLength + bytes.byteLength);
          grown.set(kept);
          grown.set(bytes, kept.byteLength);
          kept = grown;
          files.set(key, kept);
        },
        close(): void {},
      });
    },
    remove: (key: string) => {
      files.delete(key);
      return Promise.resolve();
    },
  };

  return store;
}

function ranged(asked: string[]) {
  return (_input: string, init?: RequestInit): Promise<Response> => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const range = headers.Range ?? 'whole';
    asked.push(range);

    const matched = /bytes=(\d+)-(\d+)/.exec(range);
    const from = Number(matched?.[1] ?? 0);
    const to = Math.min(Number(matched?.[2] ?? BODY.length - 1), BODY.length - 1);
    return Promise.resolve(
      new Response(BODY.slice(from, to + 1), {
        status: 206,
        headers: { 'content-range': `bytes ${from}-${to}/${BODY.length}` },
      }),
    );
  };
}

function world() {
  const passed: string[] = [];
  const asked: string[] = [];
  const env: Env = {
    fetch: (input: string | URL) => {
      passed.push(String(input));
      return Promise.resolve(String(input));
    },
  };

  const source = installModelFetch(env, {
    modelId: MODEL,
    store: held(),
    fetch: ranged(asked),
    chunkBytes: 4,
  });

  return { env, source, passed, asked };
}

describe('installModelFetch', () => {
  it('pulls the weights in ranged chunks instead of asking for the whole file', async () => {
    const { env, asked, passed } = world();

    const answered = await env.fetch(`${REPO}/onnx/encoder_model_quantized.onnx`);

    expect(asked).toEqual(['bytes=0-3']);
    expect(passed).toEqual([]);
    expect(answered).toBeInstanceOf(Response);
  });

  it('says the load came over the network once it fetched a chunk of the weights', async () => {
    const { env, source } = world();

    await env.fetch(`${REPO}/onnx/encoder_model_quantized.onnx`);
    expect(source()).toBe('network');
  });

  it('leaves the size probe to pass through, and still calls that load a cached one', async () => {
    const { env, source, asked, passed } = world();

    await env.fetch(`${REPO}/onnx/encoder_model.onnx`, {
      headers: new Headers({ Range: 'bytes=0-0' }),
    });

    expect(asked).toEqual([]);
    expect(passed).toEqual([`${REPO}/onnx/encoder_model.onnx`]);
    expect(source()).toBe('cache');
  });

  it('passes a configuration file through to the fetch it replaced', async () => {
    const { env, source } = world();

    expect(await env.fetch(`${REPO}/config.json`)).toBe(`${REPO}/config.json`);
    expect(source()).toBe('cache');
  });
});
