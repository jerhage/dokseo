import { partialName } from '$lib/domains/recognition/domain/model/model-partial';

const DEFAULT_CHUNK_BYTES = 8 * 1024 * 1024;

const PARTIAL_CONTENT = 206;

const RANGE_NOT_SATISFIABLE = 416;

export type PartAppend = {
  write(bytes: Uint8Array): void;
  close(): void;
};

export type PartialFiles = {
  sizeOf(key: string): Promise<number>;
  fileOf(key: string): Promise<Blob | null>;
  openAppend(key: string, from: number): Promise<PartAppend>;
  remove(key: string): Promise<void>;
};

export type RangedFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type ResumableOptions = {
  readonly fetch: RangedFetch;
  readonly store: PartialFiles;
  readonly chunkBytes?: number | undefined;
  readonly onTransfer?: (() => void) | undefined;
  readonly onSpan?: ((totalBytes: number, heldBytes: number) => void) | undefined;
  readonly onBytes?: ((bytes: number) => void) | undefined;
};

export type ByteSpan = {
  readonly from: number;
  readonly to: number;
  readonly total: number;
};

type Transfer = {
  readonly url: string;
  readonly key: string;
  readonly total: number;
  readonly chunkBytes: number;
  offset: number;
  chunkFrom: number;
  stored: Blob | null;
  storedAt: number;
  first: Response | null;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  append: PartAppend | null;
};

export function contentRange(header: string | null): ByteSpan | null {
  if (header === null) return null;

  const matched = /^bytes\s+(\d+)-(\d+)\/(\d+)$/.exec(header.trim());
  if (matched === null) return null;

  const [, from, to, total] = matched;
  if (from === undefined || to === undefined || total === undefined) return null;

  return { from: Number(from), to: Number(to), total: Number(total) };
}

async function requestRange(
  url: string,
  from: number,
  chunkBytes: number,
  options: ResumableOptions,
): Promise<Response> {
  const last = from + chunkBytes - 1;
  const response = await options.fetch(url, { headers: { Range: `bytes=${from}-${last}` } });
  if (response.status === PARTIAL_CONTENT) options.onTransfer?.();
  return response;
}

function assembled(body: BodyInit, source: Response, total: number): Response {
  const headers = new Headers();
  const type = source.headers.get('content-type');
  if (type !== null) headers.set('content-type', type);
  headers.set('content-length', String(total));

  return new Response(body, { status: 200, statusText: 'OK', headers });
}

function closeAppend(state: Transfer): void {
  const open = state.append;
  state.append = null;
  open?.close();
}

async function nextStoredSlice(state: Transfer): Promise<Uint8Array | null> {
  const stored = state.stored;
  if (stored === null) return null;

  if (state.storedAt >= stored.size) {
    state.stored = null;
    return null;
  }

  const end = Math.min(state.storedAt + state.chunkBytes, stored.size);
  const slice = await stored.slice(state.storedAt, end).arrayBuffer();
  state.storedAt = end;
  return new Uint8Array(slice);
}

async function openNextChunk(state: Transfer, options: ResumableOptions): Promise<void> {
  const response =
    state.first ?? (await requestRange(state.url, state.offset, state.chunkBytes, options));
  state.first = null;

  if (response.status !== PARTIAL_CONTENT) {
    throw new Error(`${state.url} answered ${response.status} for the bytes from ${state.offset}`);
  }

  const span = contentRange(response.headers.get('content-range'));
  if (span === null || span.from !== state.offset || span.total !== state.total) {
    throw new Error(`${state.url} answered a range other than the one asked for`);
  }

  const body = response.body;
  if (body === null) throw new Error(`${state.url} answered with no body`);

  state.chunkFrom = state.offset;
  state.reader = body.getReader();
  state.append = await options.store.openAppend(state.key, state.offset);
}

async function finish(
  state: Transfer,
  options: ResumableOptions,
  controller: ReadableStreamDefaultController<Uint8Array>,
): Promise<void> {
  closeAppend(state);
  const reader = state.reader;
  state.reader = null;
  await reader?.cancel().catch(() => undefined);
  controller.close();
  await options.store.remove(state.key).catch(() => undefined);
}

function resumingBody(state: Transfer, options: ResumableOptions): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async pull(controller): Promise<void> {
      try {
        for (;;) {
          const slice = await nextStoredSlice(state);
          if (slice !== null) {
            controller.enqueue(slice);
            return;
          }

          if (state.offset >= state.total) {
            await finish(state, options, controller);
            return;
          }

          if (state.reader === null) {
            await openNextChunk(state, options);
            continue;
          }

          const { done, value } = await state.reader.read();
          if (done) {
            closeAppend(state);
            state.reader = null;
            if (state.offset === state.chunkFrom) {
              throw new Error(`${state.url} sent no bytes from ${state.offset}`);
            }
            continue;
          }

          state.append?.write(value);
          state.offset += value.byteLength;
          options.onBytes?.(value.byteLength);
          controller.enqueue(value);
          if (state.offset >= state.total) await finish(state, options, controller);
          return;
        }
      } catch (cause) {
        closeAppend(state);
        state.reader = null;
        controller.error(cause);
      }
    },

    async cancel(): Promise<void> {
      closeAppend(state);
      const reader = state.reader;
      state.reader = null;
      await reader?.cancel().catch(() => undefined);
    },
  });
}

export async function fetchResumable(url: string, options: ResumableOptions): Promise<Response> {
  const chunkBytes = options.chunkBytes ?? DEFAULT_CHUNK_BYTES;
  const key = partialName(url);
  const store = options.store;

  let have = await store.sizeOf(key);
  let opened = await requestRange(url, have, chunkBytes, options);

  if (opened.status === RANGE_NOT_SATISFIABLE && have > 0) {
    await store.remove(key);
    have = 0;
    opened = await requestRange(url, 0, chunkBytes, options);
  }

  const span = contentRange(opened.headers.get('content-range'));
  if (opened.status !== PARTIAL_CONTENT || span === null || span.from !== have) {
    if (have > 0) await store.remove(key);
    if (opened.status !== PARTIAL_CONTENT) return opened;

    await opened.body?.cancel().catch(() => undefined);
    return await options.fetch(url);
  }

  options.onSpan?.(span.total, have);

  if (have === 0 && span.total <= chunkBytes) {
    const whole = await opened.arrayBuffer();
    options.onBytes?.(whole.byteLength);
    return assembled(whole, opened, span.total);
  }

  const stored = have > 0 ? await store.fileOf(key) : null;
  if (have > 0 && (stored === null || stored.size !== have)) {
    await opened.body?.cancel().catch(() => undefined);
    await store.remove(key);
    return await fetchResumable(url, options);
  }

  const state: Transfer = {
    url,
    key,
    total: span.total,
    chunkBytes,
    offset: have,
    chunkFrom: have,
    stored,
    storedAt: 0,
    first: opened,
    reader: null,
    append: null,
  };

  return assembled(resumingBody(state, options), opened, span.total);
}
