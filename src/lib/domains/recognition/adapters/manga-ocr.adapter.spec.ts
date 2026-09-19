import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMangaOcrRecognizer } from './manga-ocr.adapter';
import type { OcrReply, OcrRequest } from '../../../../workers/ocr-worker-protocol';

type StubBitmap = { readonly bitmap: ImageBitmap; wasClosed(): boolean };

type FakeWorker = {
  readonly worker: Worker;
  readonly sent: { request: OcrRequest; transfer: readonly Transferable[] }[];
  reply(reply: OcrReply): void;
  fail(message: string): void;
  breakMessage(): void;
  wasTerminated(): boolean;
};

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
  const sent: { request: OcrRequest; transfer: readonly Transferable[] }[] = [];
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  let terminated = false;

  function emit(kind: string, event: unknown): void {
    for (const listen of listeners.get(kind) ?? []) listen(event);
  }

  const worker = {
    addEventListener(kind: string, listen: (event: unknown) => void): void {
      listeners.set(kind, [...(listeners.get(kind) ?? []), listen]);
    },
    postMessage(request: OcrRequest, transfer: readonly Transferable[]): void {
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
    return {
      getContext: () => ({ drawImage: (): void => undefined }),
      transferToImageBitmap: () => stubBitmap(width, height).bitmap,
    };
  }

  vi.stubGlobal('OffscreenCanvas', FakeCanvas);
}

function recognizerOver(fake: FakeWorker): ReturnType<typeof createMangaOcrRecognizer> {
  stubOffscreenCanvas();
  return createMangaOcrRecognizer({ startWorker: () => fake.worker });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createMangaOcrRecognizer', () => {
  it('names itself manga-ocr', () => {
    expect(createMangaOcrRecognizer().id).toBe('manga-ocr');
  });

  it('starts no worker until the first recognize', () => {
    stubOffscreenCanvas();
    const fake = fakeWorker();
    let started = 0;

    const recognizer = createMangaOcrRecognizer({
      startWorker: () => {
        started += 1;
        return fake.worker;
      },
    });
    expect(started).toBe(0);

    void recognizer.recognize(stubBitmap(80, 40).bitmap);
    expect(started).toBe(1);
  });

  it('reuses one worker across recognitions', async () => {
    const fake = fakeWorker();
    let started = 0;

    stubOffscreenCanvas();
    const recognizer = createMangaOcrRecognizer({
      startWorker: () => {
        started += 1;
        return fake.worker;
      },
    });

    const first = recognizer.recognize(stubBitmap(80, 40).bitmap);
    fake.reply({ kind: 'recognized', id: 1, text: 'どうしたんだ' });
    await first;

    void recognizer.recognize(stubBitmap(80, 40).bitmap);
    expect(started).toBe(1);
  });

  it('resolves the recognized text of the reply carrying its request id', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const recognition = recognizer.recognize(stubBitmap(120, 48).bitmap);
    const id = fake.sent[0]?.request.id ?? 0;
    fake.reply({ kind: 'recognized', id, text: 'ちょっと待って' });

    const result = await recognition;
    if (!result.ok) throw new Error('The recognizer failed');
    expect(result.value.text).toBe('ちょっと待って');
    expect(result.value.confidence).toBeNull();
  });

  it('keeps two recognitions apart when the worker replies out of order', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const first = recognizer.recognize(stubBitmap(120, 48).bitmap);
    const second = recognizer.recognize(stubBitmap(240, 96).bitmap);
    const firstId = fake.sent[0]?.request.id ?? 0;
    const secondId = fake.sent[1]?.request.id ?? 0;

    fake.reply({ kind: 'recognized', id: secondId, text: '早く逃げろ' });
    fake.reply({ kind: 'recognized', id: firstId, text: 'こっちに来て' });

    const [one, two] = await Promise.all([first, second]);
    if (!one.ok || !two.ok) throw new Error('The recognizer failed');
    expect(one.value.text).toBe('こっちに来て');
    expect(two.value.text).toBe('早く逃げろ');
  });

  it('maps a load failure onto model-unavailable', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const recognition = recognizer.recognize(stubBitmap(120, 48).bitmap);
    fake.reply({
      kind: 'failed',
      id: fake.sent[0]?.request.id ?? 0,
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
    fake.reply({
      kind: 'failed',
      id: fake.sent[0]?.request.id ?? 0,
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
    fake.reply({ kind: 'recognized', id: fake.sent[0]?.request.id ?? 0, text: '   ' });

    const result = await recognition;
    if (result.ok) throw new Error('The recognizer succeeded');
    expect(result.error).toEqual({ kind: 'no-text' });
  });

  it('settles every pending recognition when the worker reports an error', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const first = recognizer.recognize(stubBitmap(120, 48).bitmap);
    const second = recognizer.recognize(stubBitmap(240, 96).bitmap);
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
      startWorker: () => {
        const next = workers[started]?.worker;
        started += 1;
        if (next === undefined) throw new Error('No worker left');
        return next;
      },
    });

    const first = recognizer.recognize(stubBitmap(120, 48).bitmap);
    workers[0]?.fail('the worker died');
    await first;

    void recognizer.recognize(stubBitmap(120, 48).bitmap);
    expect(started).toBe(2);
  });

  it('leaves the caller bitmap open and transfers a copy of it', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);
    const owned = stubBitmap(120, 48);

    const recognition = recognizer.recognize(owned.bitmap);
    const sent = fake.sent[0];
    if (sent === undefined) throw new Error('Nothing was sent to the worker');

    expect(owned.wasClosed()).toBe(false);
    expect(sent.request.image).not.toBe(owned.bitmap);
    expect(sent.transfer).toEqual([sent.request.image]);

    fake.reply({ kind: 'recognized', id: sent.request.id, text: 'ありがとう' });
    await recognition;
    expect(owned.wasClosed()).toBe(false);
  });

  it('reports download progress as a fraction', () => {
    stubOffscreenCanvas();
    const fake = fakeWorker();
    const seen: number[] = [];

    const recognizer = createMangaOcrRecognizer({
      startWorker: () => fake.worker,
      onProgress: (fraction: number) => seen.push(fraction),
    });

    void recognizer.recognize(stubBitmap(120, 48).bitmap);
    fake.reply({ kind: 'progress', id: fake.sent[0]?.request.id ?? 0, fraction: 0.42 });
    expect(seen).toEqual([0.42]);
  });
});
