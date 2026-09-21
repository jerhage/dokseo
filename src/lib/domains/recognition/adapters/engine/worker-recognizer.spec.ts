import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_MODEL_INPUT_EDGE } from '../../domain/engine/model-input';
import type { Trace, TraceFactory } from '$lib/platform/trace/pipeline-trace';
import type { RecognizerSetup } from '../../domain/engine/recognizer-setup';
import type { TextRecognizer } from '../../domain/engine/text-recognizer';
import { createWorkerRecognizer } from './worker-recognizer';
import type { OcrReply, OcrRequest } from '../../../../../workers/ocr-worker-protocol';

type StubBitmap = { readonly bitmap: ImageBitmap; wasClosed(): boolean };

type Sent = { request: OcrRequest; transfer: readonly Transferable[] };

type Crop = {
  readonly id: number;
  readonly image: ImageBitmap;
  readonly transfer: readonly Transferable[];
};

type FakeWorker = {
  readonly worker: Worker;
  readonly sent: Sent[];
  reply(reply: OcrReply): void;
};

type StubTrace = {
  readonly begin: TraceFactory;
  readonly labels: string[];
  readonly steps: [string, Record<string, unknown>][];
  readonly images: [string, ImageBitmap][];
  readonly ends: () => number;
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

function stubTrace(): StubTrace {
  const labels: string[] = [];
  const steps: [string, Record<string, unknown>][] = [];
  const images: [string, ImageBitmap][] = [];
  let ended = 0;

  const trace: Trace = {
    step: (name, detail) => steps.push([name, detail]),
    image: (name, bitmap) => images.push([name, bitmap]),
    end: () => {
      ended += 1;
    },
  };

  return {
    begin: (label: string): Trace => {
      labels.push(label);
      return trace;
    },
    labels,
    steps,
    images,
    ends: () => ended,
  };
}

function fakeWorker(): FakeWorker {
  const sent: Sent[] = [];
  const listeners = new Map<string, ((event: unknown) => void)[]>();

  const worker = {
    addEventListener(kind: string, listen: (event: unknown) => void): void {
      listeners.set(kind, [...(listeners.get(kind) ?? []), listen]);
    },
    postMessage(request: OcrRequest, transfer: readonly Transferable[] = []): void {
      sent.push({ request, transfer });
    },
    terminate(): void {
      return undefined;
    },
  } as unknown as Worker;

  return {
    worker,
    sent,
    reply: (reply: OcrReply) => {
      for (const listen of listeners.get('message') ?? []) listen({ data: reply });
    },
  };
}

function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function recognizerOver(fake: FakeWorker, beginTrace?: TraceFactory): TextRecognizer {
  return createWorkerRecognizer({
    id: 'stub-ocr',
    readSetup: () => Promise.resolve(SETUP),
    startWorker: () => fake.worker,
    ...(beginTrace === undefined ? {} : { beginTrace }),
  });
}

async function openedOver(fake: FakeWorker): Promise<void> {
  await tick();
  const opening = fake.sent[0];
  if (opening === undefined || opening.request.kind !== 'open') {
    throw new Error('No open request was sent to the worker');
  }

  fake.reply({
    kind: 'opened',
    id: opening.request.id,
    modelId: SETUP.modelId,
    device: 'wasm',
    fellBackFrom: null,
  });
  await tick();
}

function cropSent(fake: FakeWorker): Crop {
  const sent = fake.sent.find((one) => one.request.kind === 'recognize');
  if (sent === undefined || sent.request.kind !== 'recognize') {
    throw new Error('No crop was sent to the worker');
  }

  return { id: sent.request.id, image: sent.request.image, transfer: sent.transfer };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createWorkerRecognizer', () => {
  it('caps the long edge of the bitmap it sends to the model', async () => {
    stubOffscreenCanvas();
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    void recognizer.recognize(stubBitmap(6000, 900).bitmap);
    await openedOver(fake);

    const crop = cropSent(fake);
    expect(crop.image.width).toBe(MAX_MODEL_INPUT_EDGE);
    expect(crop.image.height).toBe(Math.round((900 * MAX_MODEL_INPUT_EDGE) / 6000));
  });

  it('leaves the bitmap it was handed alone', async () => {
    stubOffscreenCanvas();
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);
    const handed = stubBitmap(6000, 900);

    const recognition = recognizer.recognize(handed.bitmap);
    await openedOver(fake);
    const crop = cropSent(fake);
    fake.reply({ kind: 'recognized', id: crop.id, text: 'ありがとう', confidence: null });
    await recognition;

    expect(handed.wasClosed()).toBe(false);
    expect(crop.image).not.toBe(handed.bitmap);
  });

  it('transfers the prepared bitmap', async () => {
    stubOffscreenCanvas();
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);
    const handed = stubBitmap(120, 48);

    void recognizer.recognize(handed.bitmap);
    await openedOver(fake);

    const crop = cropSent(fake);
    expect(crop.transfer).toEqual([crop.image]);
    expect(crop.transfer).not.toContain(handed.bitmap);
  });

  it('traces the capping, the greyscale and the picture the model reads', async () => {
    stubOffscreenCanvas();
    const fake = fakeWorker();
    const trace = stubTrace();
    const recognizer = recognizerOver(fake, trace.begin);

    void recognizer.recognize(stubBitmap(6000, 900).bitmap);
    await openedOver(fake);

    const crop = cropSent(fake);
    expect(trace.labels).toEqual(['prepare-input']);
    expect(trace.steps.map(([name]) => name)).toEqual(['capped', 'greyscale']);
    expect(trace.steps[0]?.[1]).toEqual({
      factor: MAX_MODEL_INPUT_EDGE / 6000,
      width: MAX_MODEL_INPUT_EDGE,
      height: Math.round((900 * MAX_MODEL_INPUT_EDGE) / 6000),
    });
    expect(trace.images).toEqual([['input', crop.image]]);
    expect(trace.ends()).toBe(1);
  });

  it('recognizes without a trace factory', async () => {
    stubOffscreenCanvas();
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const recognition = recognizer.recognize(stubBitmap(120, 48).bitmap);
    await openedOver(fake);
    const crop = cropSent(fake);
    fake.reply({ kind: 'recognized', id: crop.id, text: 'こんにちは', confidence: null });

    const result = await recognition;
    if (!result.ok) throw new Error('The recognizer failed');
    expect(result.value.text).toBe('こんにちは');
  });

  it('reports a preparation that throws as a failed recognition', async () => {
    const fake = fakeWorker();
    const recognizer = recognizerOver(fake);

    const recognition = recognizer.recognize(stubBitmap(120, 48).bitmap);
    await openedOver(fake);

    const result = await recognition;
    if (result.ok) throw new Error('The recognizer succeeded');
    expect(result.error.kind).toBe('recognition-failed');
    expect(fake.sent.filter((one) => one.request.kind === 'recognize')).toHaveLength(0);
  });
});
