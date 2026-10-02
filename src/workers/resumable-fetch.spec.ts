import { describe, expect, it } from 'vitest';
import { partialName } from '$lib/domains/recognition/domain/model/model-partial';
import { HttpError } from '$lib/platform/http/http-error';
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
  const caching: (RequestCache | undefined)[] = [];

  function fetching(_input: string, init?: RequestInit): Promise<Response> {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const range = headers.Range;
    asked.push(range ?? 'whole');
    caching.push(init?.cache);

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

  return { fetching, asked, caching };
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

  it('resumes from the bytes already on this device rather than fetching them again, and deletes the part-downloaded file at the last byte', async () => {
    const body = weights(10);
    const served = host(body);
    const { store, files } = fakeStore(body.slice(0, 6));

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });

    expect(served.asked).toEqual(['bytes=6-9']);
    expect(await bodyOf(response)).toEqual(body);
    expect(files.has(KEY)).toBe(false);
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

  it('rejects with an HttpError for a status the range request does not expect', async () => {
    const { store } = fakeStore();
    const missing = () => Promise.resolve(new Response(null, { status: 404 }));

    const fetching = fetchResumable(URL_OF_WEIGHTS, { fetch: missing, store, chunkBytes: CHUNK });

    await expect(fetching).rejects.toBeInstanceOf(HttpError);
    await expect(fetching).rejects.toHaveProperty('status', 404);
  });

  it('rejects with an HttpError when the host refuses a range although nothing is held', async () => {
    const served = host(weights(0));
    const { store } = fakeStore();

    const fetching = fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });

    await expect(fetching).rejects.toHaveProperty('status', 416);
  });

  it('fails the body with an HttpError when a later chunk answers a server error', async () => {
    const served = host(weights(10));
    const { store, files } = fakeStore();
    const failing = (input: string, init?: RequestInit): Promise<Response> =>
      served.asked.length === 0
        ? served.fetching(input, init)
        : Promise.resolve(new Response(null, { status: 503 }));

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: failing,
      store,
      chunkBytes: CHUNK,
    });

    await expect(bodyOf(response)).rejects.toHaveProperty('status', 503);
    expect(files.get(KEY)).toEqual(weights(10).slice(0, 4));
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

  it.each([
    { ranges: true, expected: 1 },
    { ranges: false, expected: 0 },
  ])(
    'says a transfer happened only once the host answered with a range of bytes (ranges: $ranges)',
    async ({ ranges, expected }) => {
      const body = weights(10);
      const served = host(body, { ranges });
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

      expect(transfers).toBe(expected);
    },
  );

  it('bypasses the HTTP cache for every chunk it asks for', async () => {
    const served = host(weights(10));
    const { store } = fakeStore();

    const response = await fetchResumable(URL_OF_WEIGHTS, {
      fetch: served.fetching,
      store,
      chunkBytes: CHUNK,
    });
    await bodyOf(response);

    expect(served.caching).toEqual(['no-store', 'no-store', 'no-store']);
  });

  it('bypasses the HTTP cache for the whole file when the host answers another range', async () => {
    const body = weights(10);
    const caching: (RequestCache | undefined)[] = [];
    const { store } = fakeStore(body.slice(0, 4));

    function fromTheStart(_input: string, init?: RequestInit): Promise<Response> {
      caching.push(init?.cache);
      return Promise.resolve(
        new Response(body.slice(0, CHUNK), {
          status: 206,
          headers: { 'content-range': `bytes 0-${CHUNK - 1}/${body.length}` },
        }),
      );
    }

    await fetchResumable(URL_OF_WEIGHTS, { fetch: fromTheStart, store, chunkBytes: CHUNK });

    expect(caching).toEqual(['no-store', 'no-store']);
  });
});
