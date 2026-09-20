import type { ProgressInfo } from '@huggingface/transformers';
import { describeCause } from '$lib/shared/cause';
import { mostLikelyToken, type DecoderLogits } from './most-likely-token';
import type { OcrReply, OcrRequest } from './ocr-worker-protocol';

const MODEL_ID = 'DigitalLarynx/manga-ocr-onnx';

const ENCODER_WEIGHTS = 'q8';

const DECODER_WEIGHTS = 'fp32';

const DECODER_START_TOKEN = 2;

const END_OF_TEXT_TOKEN = 3;

const MAX_TOKENS = 300;

const FULL_PERCENT = 100;

type InferenceSession = {
  run(feeds: Record<string, unknown>): Promise<Record<string, unknown>>;
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
  const { AutoModel, AutoProcessor, AutoTokenizer, env, RawImage, Tensor } =
    await import('@huggingface/transformers');
  env.allowLocalModels = false;

  const device = await chooseDevice();
  const [processor, tokenizer, model] = await Promise.all([
    AutoProcessor.from_pretrained(MODEL_ID),
    AutoTokenizer.from_pretrained(MODEL_ID),
    AutoModel.from_pretrained(MODEL_ID, {
      device,
      dtype: { encoder_model: ENCODER_WEIGHTS, decoder_model_merged: DECODER_WEIGHTS },
      progress_callback: reportProgress,
    }),
  ]);

  const sessions = model.sessions as Record<string, InferenceSession | undefined>;
  const encoder = sessions.model;
  const decoder = sessions.decoder_model_merged;
  if (encoder === undefined || decoder === undefined) {
    throw new Error(`${MODEL_ID} did not load as an encoder and a decoder session`);
  }

  return {
    async read(image: ImageBitmap): Promise<string> {
      const inputs = await processor(RawImage.fromCanvas(canvasOf(image)));
      const encoded = await encoder.run({ pixel_values: inputs.pixel_values });
      const tokens = [DECODER_START_TOKEN];

      while (tokens.length < MAX_TOKENS) {
        const step = await decoder.run({
          input_ids: new Tensor('int64', BigInt64Array.from(tokens, BigInt), [1, tokens.length]),
          encoder_hidden_states: encoded.last_hidden_state,
        });

        const next = mostLikelyToken(step.logits as DecoderLogits);
        if (next === END_OF_TEXT_TOKEN) break;
        tokens.push(next);
      }

      const text: string = tokenizer.decode(tokens, { skip_special_tokens: true });
      return text.replace(/\s+/gu, '');
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
