import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModelLoad } from '../../domain/model/model-load';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { RecognizerSetup } from '../../domain/engine/recognizer-setup';
import { createMangaOcrRecognizer } from './manga-ocr.adapter';
import type { OcrReply, OcrRequest } from '../../../../../workers/ocr-worker-protocol';

type StubBitmap = { readonly bitmap: ImageBitmap; wasClosed(): boolean };

type Sent = { request: OcrRequest; transfer: readonly Transferable[] };

type FakeWorker = {
  readonly worker: Worker;
  readonly sent: Sent[];
  reply(reply: OcrReply): void;
  fail(message: string): void;
  breakMessage(): void;
  wasTerminated(): boolean;
};

const SETUP: RecognizerSetup = { modelId: 'DigitalLarynx/manga-ocr-onnx', compute: 'auto' };

function stubBitmap(width: number, height: number): StubBitmap {
  let closed = false;
  const bitmap = {
    width,
    height,
    close: (): void => {
      closed = true;
    },
  } as unknown as ImageBitmap;

  return { bitmap, wasClosed: () => closed };
}

function fakeWorker(): FakeWorker {
  const sent: Sent[] = [];
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  let terminated = false;

  function emit(kind: string, event: unknown): void {
    for (const listen of listeners.get(kind) ?? []) listen(event);
  }

  const worker = {
    addEventListener(kind: string, listen: (event: unknown) => void): void {
      listeners.set(kind, [...(listeners.get(kind) ?? []), listen]);
    },
    postMessage(request: OcrRequest, transfer: readonly Transferable[] = []): void {
      sent.push({ request, transfer });
    },
    terminate(): void {
      terminated = true;
    },
  } as unknown as Worker;

  return {
    worker,
    sent,
    reply: (reply: OcrReply) => emit('message', { data: reply }),
    fail: (message: string) => emit('error', { message }),
    breakMessage: () => emit('messageerror', {}),
    wasTerminated: () => terminated,
  };
}

function stubOffscreenCanvas(): void {
  function FakeCanvas(this: unknown, width: number, height: number): unknown {
    const canvas = {
      getContext: () => context,
      transferToImageBitmap: () => stubBitmap(width, height).bitmap,
    };
    const context = {
      canvas,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: (): void => undefined,
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: (): void => undefined,
    };
    return canvas;
  }

  vi.stubGlobal('OffscreenCanvas', FakeCanvas);
}

function recognizerOver(fake: FakeWorker): ReturnType<typeof createMangaOcrRecognizer> {
  stubOffscreenCanvas();
  return createMangaOcrRecognizer({
    readSetup: () => Promise.resolve(SETUP),
    startWorker: () => fake.worker,
  });
}

function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function requestOf(fake: FakeWorker, at: number): OcrRequest {
  const sent = fake.sent[at];
  if (sent === undefined) throw new Error(`Nothing was sent to the worker at ${at}`);
  return sent.request;
}

async function openId(fake: FakeWorker): Promise<number> {
  await tick();
  const request = requestOf(fake, 0);
  if (request.kind !== 'open') throw new Error('The first request was not an open');
  return request.id;
}

async function openedOver(fake: FakeWorker, device: 'wasm' | 'webgpu' = 'wasm'): Promise<void> {
  const id = await openId(fake);
  fake.reply({ kind: 'opened', id, modelId: SETUP.modelId, device, fellBackFrom: null });
  await tick();
}

function cropsIn(fake: FakeWorker): readonly Sent[] {
  return fake.sent.filter((one) => one.request.kind === 'recognize');
}

function cropId(fake: FakeWorker, at: number): number {
  const sent = cropsIn(fake)[at];
  if (sent === undefined) throw new Error(`No crop was sent at ${at}`);
  return sent.request.id;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createMangaOcrRecognizer', () => {
  it('names itself manga-ocr', () => {
    expect(recognizerOver(fakeWorker()).id).toBe('manga-ocr');
  });

  it('starts no worker until the first recognition is asked for', async () => {
    stubOffscreenCanvas();
    const fake = fakeWorker();
    let started = 0;

    const recognizer = createMangaOcrRecognizer({
      readSetup: () => Promise.resolve(SETUP),
      startWorker: () => {
        started += 1;
        return fake.worker;
      },
    });
    expect(started).toBe(0);

    void recognizer.recognize(stubBitmap(80, 40).bitmap);
    await tick();
    expect(started).toBe(1);
  });

  it('opens the session with the stored setup before it sends a crop', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    void recognizer.recognize(stubBitmap(80, 40).bitmap);
    await tick();

    expect(requestOf(fake, 0)).toEqual({ kind: 'open', id: 1, setup: SETUP });
    expect(cropsIn(fake)).toHaveLength(0);
  });

  it('reuses one worker across recognitions', async () => {
    const fake = fakeWorker();
    let started = 0;

    stubOffscreenCanvas();
    const recognizer = createMangaOcrRecognizer({
      readSetup: () => Promise.resolve(SETUP),
      startWorker: () => {
        started += 1;
        return fake.worker;
      },
    });

    const first = recognizer.recognize(stubBitmap(80, 40).bitmap);
    await openedOver(fake);
    fake.reply({ kind: 'recognized', id: cropId(fake, 0), text: 'どうしたんだ', confidence: null });
    await first;

    void recognizer.recognize(stubBitmap(80, 40).bitmap);
    await tick();
    expect(started).toBe(1);
  });

  it('resolves the recognized text of the reply carrying its request id', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const recognition = recognizer.recognize(stubBitmap(120, 48).bitmap);
    await openedOver(fake);
    fake.reply({
      kind: 'recognized',
      id: cropId(fake, 0),
      text: 'ちょっと待って',
      confidence: null,
    });

    const result = await recognition;
    if (!result.ok) throw new Error('The recognizer failed');
    expect(result.value.text).toBe('ちょっと待って');
    expect(result.value.confidence).toBeNull();
  });

  it('keeps two recognitions apart when the worker replies out of order', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const first = recognizer.recognize(stubBitmap(120, 48).bitmap);
    await openedOver(fake);
    const second = recognizer.recognize(stubBitmap(240, 96).bitmap);
    await tick();

    fake.reply({ kind: 'recognized', id: cropId(fake, 1), text: '早く逃げろ', confidence: null });
    fake.reply({ kind: 'recognized', id: cropId(fake, 0), text: 'こっちに来て', confidence: null });

    const [one, two] = await Promise.all([first, second]);
    if (!one.ok || !two.ok) throw new Error('The recognizer failed');
    expect(one.value.text).toBe('こっちに来て');
    expect(two.value.text).toBe('早く逃げろ');
  });

  it('maps a failure to open the session onto model-unavailable', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const recognition = recognizer.recognize(stubBitmap(120, 48).bitmap);
    const id = await openId(fake);
    fake.reply({
      kind: 'failed',
      id,
      failure: 'model-unavailable',
      cause: 'the weights did not download',
    });

    const result = await recognition;
    if (result.ok) throw new Error('The recognizer succeeded');
    expect(result.error).toEqual({
      kind: 'model-unavailable',
      cause: 'the weights did not download',
    });
  });

  it('maps an inference failure onto recognition-failed', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const recognition = recognizer.recognize(stubBitmap(120, 48).bitmap);
    await openedOver(fake);
    fake.reply({
      kind: 'failed',
      id: cropId(fake, 0),
      failure: 'recognition-failed',
      cause: 'the decoder threw',
    });

    const result = await recognition;
    if (result.ok) throw new Error('The recognizer succeeded');
    expect(result.error).toEqual({ kind: 'recognition-failed', cause: 'the decoder threw' });
  });

  it('maps generated text of only whitespace onto no-text', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const recognition = recognizer.recognize(stubBitmap(120, 48).bitmap);
    await openedOver(fake);
    fake.reply({ kind: 'recognized', id: cropId(fake, 0), text: '   ', confidence: null });

    const result = await recognition;
    if (result.ok) throw new Error('The recognizer succeeded');
    expect(result.error).toEqual({ kind: 'no-text' });
  });

  it('settles every pending recognition when the worker reports an error', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const first = recognizer.recognize(stubBitmap(120, 48).bitmap);
    await openedOver(fake);
    const second = recognizer.recognize(stubBitmap(240, 96).bitmap);
    await tick();
    fake.fail('the worker died');

    const [one, two] = await Promise.all([first, second]);
    if (one.ok || two.ok) throw new Error('The recognizer succeeded');
    expect(one.error).toEqual({ kind: 'recognition-failed', cause: 'the worker died' });
    expect(two.error).toEqual({ kind: 'recognition-failed', cause: 'the worker died' });
    expect(fake.wasTerminated()).toBe(true);
  });

  it('settles every pending recognition when a reply cannot be read', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const recognition = recognizer.recognize(stubBitmap(120, 48).bitmap);
    await openedOver(fake);
    fake.breakMessage();

    const result = await recognition;
    if (result.ok) throw new Error('The recognizer succeeded');
    expect(result.error.kind).toBe('recognition-failed');
  });

  it('starts a new worker after the previous one died', async () => {
    stubOffscreenCanvas();
    const workers = [fakeWorker(), fakeWorker()];
    let started = 0;

    const recognizer = createMangaOcrRecognizer({
      readSetup: () => Promise.resolve(SETUP),
      startWorker: () => {
        const next = workers[started]?.worker;
        started += 1;
        if (next === undefined) throw new Error('No worker left');
        return next;
      },
    });

    const first = recognizer.recognize(stubBitmap(120, 48).bitmap);
    await tick();
    workers[0]?.fail('the worker died');
    await first;

    void recognizer.recognize(stubBitmap(120, 48).bitmap);
    await tick();
    expect(started).toBe(2);
  });

  it('leaves the caller bitmap open and transfers a copy of it', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);
    const owned = stubBitmap(120, 48);

    const recognition = recognizer.recognize(owned.bitmap);
    await openedOver(fake);

    const sent = cropsIn(fake)[0];
    if (sent === undefined || sent.request.kind !== 'recognize') {
      throw new Error('No crop was sent to the worker');
    }

    expect(owned.wasClosed()).toBe(false);
    expect(sent.request.image).not.toBe(owned.bitmap);
    expect(sent.transfer).toEqual([sent.request.image]);

    fake.reply({ kind: 'recognized', id: sent.request.id, text: 'ありがとう', confidence: null });
    await recognition;
    expect(owned.wasClosed()).toBe(false);
  });

  it('reports load progress as a fraction, the bytes and the source they came from', async () => {
    stubOffscreenCanvas();
    const fake = fakeWorker();
    const seen: ModelLoad[] = [];

    const recognizer = createMangaOcrRecognizer({
      readSetup: () => Promise.resolve(SETUP),
      startWorker: () => fake.worker,
      onProgress: (load: ModelLoad) => seen.push(load),
    });

    void recognizer.prepare();
    await tick();
    fake.reply({
      kind: 'progress',
      fraction: 0.42,
      loadedBytes: 88_000_000,
      totalBytes: 211_000_000,
      source: 'network',
    });

    expect(seen).toEqual([
      { fraction: 0.42, source: 'network', loadedBytes: 88_000_000, totalBytes: 211_000_000 },
    ]);
  });

  it('resolves prepare with the model and the device the worker chose', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);
    const seen: RecognizerSession[] = [];

    const opening = recognizer.prepare();
    const id = await openId(fake);
    fake.reply({
      kind: 'opened',
      id,
      modelId: SETUP.modelId,
      device: 'webgpu',
      fellBackFrom: null,
    });

    const opened = await opening;
    if (!opened.ok) throw new Error('The session did not open');
    expect(opened.value).toEqual({
      modelId: SETUP.modelId,
      device: 'webgpu',
      fellBackFrom: null,
    });
    expect(seen).toEqual([]);
  });

  it('reports no session and no worker when no model is configured', async () => {
    stubOffscreenCanvas();
    let started = 0;

    const recognizer = createMangaOcrRecognizer({
      readSetup: () => Promise.resolve(null),
      startWorker: () => {
        started += 1;
        return fakeWorker().worker;
      },
    });

    const opened = await recognizer.prepare();
    if (opened.ok) throw new Error('A session opened without a model');
    expect(opened.error.kind).toBe('unavailable');
    expect(started).toBe(0);
  });

  it('settles a load as cancelled and terminates the worker', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const opening = recognizer.prepare();
    await openId(fake);
    recognizer.cancel();

    const opened = await opening;
    if (opened.ok) throw new Error('The cancelled load opened a session');
    expect(opened.error).toEqual({ kind: 'cancelled' });
    expect(fake.wasTerminated()).toBe(true);
  });

  it('opens a fresh worker after a cancelled load', async () => {
    stubOffscreenCanvas();
    const workers = [fakeWorker(), fakeWorker()];
    let started = 0;

    const recognizer = createMangaOcrRecognizer({
      readSetup: () => Promise.resolve(SETUP),
      startWorker: () => {
        const next = workers[started]?.worker;
        started += 1;
        if (next === undefined) throw new Error('No worker left');
        return next;
      },
    });

    void recognizer.prepare();
    await tick();
    recognizer.cancel();

    void recognizer.prepare();
    await tick();
    expect(started).toBe(2);
  });
});
