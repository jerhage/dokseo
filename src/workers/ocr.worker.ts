import type { ProgressInfo } from '@huggingface/transformers';
import { describeCause } from '$lib/shared/cause';
import type { OcrReply, OcrRequest } from './ocr-worker-protocol';

const MODEL_ID = 'onnx-community/manga-ocr-base-ONNX';

const WEIGHTS = 'q8';

const FULL_PERCENT = 100;

const GENERATION = {
  num_beams: 4,
  early_stopping: true,
  max_length: 300,
  no_repeat_ngram_size: 3,
};

type Session = {
  read(image: ImageBitmap): Promise<string>;
};

type WorkerScope = {
  postMessage(reply: OcrReply): void;
  addEventListener(kind: 'message', listen: (event: MessageEvent<OcrRequest>) => void): void;
};

const scope = self as unknown as WorkerScope;

const post = scope.postMessage.bind(scope);

const inFlight = new Set<number>();

let opening: Promise<Session> | null = null;

function reportProgress(info: ProgressInfo): void {
  if (info.status !== 'progress_total') return;

  const fraction = Math.min(1, Math.max(0, info.progress / FULL_PERCENT));
  for (const id of inFlight) post({ kind: 'progress', id, fraction });
}

async function chooseDevice(): Promise<'webgpu' | 'wasm'> {
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    return adapter === null || adapter === undefined ? 'wasm' : 'webgpu';
  } catch {
    return 'wasm';
  }
}

function canvasOf(image: ImageBitmap): OffscreenCanvas {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error(
      `A 2D drawing context was unavailable for a ${image.width}x${image.height} crop`,
    );
  }

  context.drawImage(image, 0, 0);
  return canvas;
}

async function openSession(): Promise<Session> {
  const { env, pipeline, RawImage } = await import('@huggingface/transformers');
  env.allowLocalModels = false;

  const device = await chooseDevice();
  const recognize = await pipeline('image-to-text', MODEL_ID, {
    device,
    dtype: { encoder_model: WEIGHTS, decoder_model: WEIGHTS },
    progress_callback: reportProgress,
  });

  return {
    async read(image: ImageBitmap): Promise<string> {
      const output = await recognize(RawImage.fromCanvas(canvasOf(image)), GENERATION);
      return output[0]?.generated_text ?? '';
    },
  };
}

function sessionOnce(): Promise<Session> {
  opening ??= openSession().catch((cause: unknown): never => {
    opening = null;
    throw cause;
  });

  return opening;
}

async function handle(request: OcrRequest): Promise<void> {
  const { id, image } = request;
  inFlight.add(id);

  try {
    let session: Session;
    try {
      session = await sessionOnce();
    } catch (cause) {
      post({ kind: 'failed', id, failure: 'model-unavailable', cause: describeCause(cause) });
      return;
    }

    try {
      const text = await session.read(image);
      post({ kind: 'recognized', id, text });
    } catch (cause) {
      post({ kind: 'failed', id, failure: 'recognition-failed', cause: describeCause(cause) });
    }
  } finally {
    inFlight.delete(id);
    image.close();
  }
}

scope.addEventListener('message', (event: MessageEvent<OcrRequest>) => {
  void handle(event.data);
});
