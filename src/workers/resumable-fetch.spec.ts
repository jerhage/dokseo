import { describe, expect, it } from 'vitest';
import { partialName } from '$lib/domains/recognition/domain/model/model-partial';
import { fetchResumable } from './resumable-fetch';
import type { PartAppend, PartialFiles } from './resumable-fetch';

const URL_OF_WEIGHTS =
  'https://huggingface.co/DigitalLarynx/manga-ocr-onnx/resolve/main/onnx/encoder_model_quantized.onnx';

const KEY = partialName(URL_OF_WEIGHTS);

const CHUNK = 4;

function weights(size: number): Uint8Array<ArrayBuffer> {
  return Uint8Array.from({ length: size }, (_, at) => at % 251);
}

function fakeStore(held: Uint8Array<ArrayBuffer> | null = null) {
  const files = new Map<string, Uint8Array<ArrayBuffer>>();
  if (held !== null) files.set(KEY, held);

  const closed: number[] = [];
  const open = new Set<string>();

  const store: PartialFiles = {
    sizeOf: (key: string) => Promise.resolve(files.get(key)?.byteLength ?? 0),
    fileOf: (key: string) => {
      const found = files.get(key);
      return Promise.resolve(found === undefined ? null : new Blob([found]));
    },
    openAppend: (key: string, from: number): Promise<PartAppend> => {
      let kept = (files.get(key) ?? new Uint8Array(0)).slice(0, from);
      files.set(key, kept);
      open.add(key);

      return Promise.resolve({
        write(bytes: Uint8Array): void {
          const grown = new Uint8Array(kept.byteLength + bytes.byteLength);
          grown.set(kept);
          grown.set(bytes, kept.byteLength);
          kept = grown;
          files.set(key, kept);
        },
        close(): void {
          open.delete(key);
          closed.push(kept.byteLength);
        },
      });
    },
    remove: (key: string) => {
      if (open.has(key)) {
        return Promise.reject(new Error(`Part "${key}" is locked by an open access handle`));
      }

      files.delete(key);
      return Promise.resolve();
    },
  };

  return { store, files, closed, open };
}

type HostOptions = {
  readonly ranges?: boolean;
  readonly failFrom?: number;
};

function host(body: Uint8Array, options: HostOptions = {}) {
  const asked: string[] = [];

  function fetching(_input: string, init?: RequestInit): Promise<Response> {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const range = headers.Range;
    asked.push(range ?? 'whole');

    if (range === undefined || options.ranges === false) {
      return Promise.resolve(new Response(body.slice(), { status: 200 }));
    }

    const matched = /bytes=(\d+)-(\d+)/.exec(range);
    const from = Number(matched?.[1] ?? 0);
    if (options.failFrom !== undefined && from >= options.failFrom) {
      return Promise.reject(new Error('The connection dropped'));
    }

    if (from >= body.length) return Promise.resolve(new Response(null, { status: 416 }));

    const to = Math.min(Number(matched?.[2] ?? 0), body.length - 1);
    return Promise.resolve(
      new Response(body.slice(from, to + 1), {
        status: 206,
        headers: { 'content-range': `bytes ${from}-${to}/${body.length}` },
      }),
    );
  }

  return { fetching, asked };
}

async function bodyOf(response: Response): Promise<Uint8Array> {
  return new Uint8Array(await response.arrayBuffer());
}

describe('fetchResumable', () => {
  it('hands back the whole file although it asked for it a chunk at a time', async () => {
    const body = weights(10);
    const served = host(body);
    const { store } = fakeStore();

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe('10');
    expect(await bodyOf(response)).toEqual(body);
    expect(served.asked).toEqual(['bytes=0-3', 'bytes=4-7', 'bytes=8-11']);
  });

  it('deletes the part-downloaded file only after the whole body was handed over', async () => {
    const body = weights(10);
    const served = host(body);
    const { store, files } = fakeStore();

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });

    expect(files.has(KEY)).toBe(false);
    await bodyOf(response);
    expect(files.has(KEY)).toBe(false);
  });

  it('closes the file it appended to before it asks for that file to be deleted', async () => {
    const body = weights(10);
    const served = host(body);
    const { store, open, closed } = fakeStore();

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });
    await bodyOf(response);

    expect(open.has(KEY)).toBe(false);
    expect(closed).toHaveLength(3);
  });

  it('deletes the part-downloaded file when the last chunk completes the download', async () => {
    const body = weights(12);
    const served = host(body);
    const { store, files } = fakeStore();

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });
    expect(await bodyOf(response)).toEqual(body);

    expect(files.has(KEY)).toBe(false);
  });

  it('deletes the part-downloaded file when a resumed download reaches the last byte', async () => {
    const body = weights(10);
    const served = host(body);
    const { store, files } = fakeStore(body.slice(0, 6));

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });
    expect(await bodyOf(response)).toEqual(body);

    expect(files.has(KEY)).toBe(false);
  });

  it('resumes from the bytes already on this device rather than fetching them again', async () => {
    const body = weights(10);
    const served = host(body);
    const { store } = fakeStore(body.slice(0, 6));

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });

    expect(served.asked).toEqual(['bytes=6-9']);
    expect(await bodyOf(response)).toEqual(body);
  });

  it('keeps every byte it wrote when the load stops part-way', async () => {
    const body = weights(10);
    const served = host(body);
    const { store, files } = fakeStore();

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });

    const reader = response.body?.getReader();
    if (reader === undefined) throw new Error('The response carried no body');

    await reader.read();
    await reader.cancel();

    expect(files.get(KEY)).toEqual(body.slice(0, 4));
  });

  it('carries on from a paused download when it is asked for the file again', async () => {
    const body = weights(10);
    const first = host(body);
    const { store, files } = fakeStore();

    const paused = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: first.fetching,
      store,
      chunkBytes: CHUNK,
    });

    const reader = paused.body?.getReader();
    if (reader === undefined) throw new Error('The response carried no body');
    await reader.read();
    await reader.cancel();

    const second = host(body);
    const resumed = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: second.fetching,
      store,
      chunkBytes: CHUNK,
    });

    expect(await bodyOf(resumed)).toEqual(body);
    expect(second.asked).toEqual(['bytes=4-7', 'bytes=8-11']);
    expect(files.has(KEY)).toBe(false);
  });

  it('keeps what it has when a chunk fails half way through the file', async () => {
    const body = weights(10);
    const served = host(body, { failFrom: 4 });
    const { store, files } = fakeStore();

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });

    await expect(bodyOf(response)).rejects.toThrow('The connection dropped');
    expect(files.get(KEY)).toEqual(body.slice(0, 4));
  });

  it('starts again from nothing when the host refuses the range it held', async () => {
    const body = weights(10);
    const served = host(body);
    const { store } = fakeStore(weights(20));

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });

    expect(served.asked[0]).toBe('bytes=20-23');
    expect(await bodyOf(response)).toEqual(body);
  });

  it('hands back what the host sent and stores nothing when it ignores the range', async () => {
    const body = weights(10);
    const served = host(body, { ranges: false });
    const { store, files } = fakeStore();

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual(body);
    expect(files.size).toBe(0);
  });

  it('stores nothing for a payload that fits in a single chunk', async () => {
    const body = weights(3);
    const served = host(body);
    const { store, files } = fakeStore();

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });

    expect(await bodyOf(response)).toEqual(body);
    expect(files.size).toBe(0);
    expect(served.asked).toEqual(['bytes=0-3']);
  });

  it('says a transfer happened only once the host answered with bytes', async () => {
    const body = weights(10);
    const served = host(body);
    const { store } = fakeStore();
    let transfers = 0;

    await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
      onTransfer: () => {
        transfers += 1;
      },
    });

    expect(transfers).toBe(1);
  });
});
