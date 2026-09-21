import { chosenDevice } from '$lib/domains/recognition/domain/engine/compute-choice';
import type { ComputeChoice } from '$lib/domains/recognition/domain/engine/compute-choice';
import { japaneseOcrText } from '$lib/domains/recognition/domain/engine/japanese-ocr-text';
import { mostLikelyToken } from '$lib/domains/recognition/domain/engine/most-likely-token';
import type { DecoderLogits } from '$lib/domains/recognition/domain/engine/most-likely-token';
import type { RecognizerSetup } from '$lib/domains/recognition/domain/engine/recognizer-setup';
import { knownModel } from '$lib/domains/recognition/domain/model/model-footprint';
import { QUANTIZED_THROUGHOUT } from '$lib/domains/recognition/domain/model/model-weights';
import { describeCause } from '$lib/shared/cause';
import { openOnDevice } from './device-fallback';
import { installModelFetch } from './model-fetch';
import type { OcrReply, OcrRequest } from './ocr-worker-protocol';

const DECODER_START_TOKEN = 2;

const END_OF_TEXT_TOKEN = 3;

const MAX_TOKENS = 300;

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

let opening: Promise<Session> | null = null;

async function deviceFor(compute: ComputeChoice): Promise<ReturnType<typeof chosenDevice>> {
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    return chosenDevice(compute, adapter !== null && adapter !== undefined);
  } catch {
    return chosenDevice(compute, false);
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

async function openSession(setup: RecognizerSetup, id: number): Promise<Session> {
  const { AutoModel, AutoProcessor, AutoTokenizer, env, RawImage, Tensor } =
    await import('@huggingface/transformers');
  env.allowLocalModels = false;

  const modelId = setup.modelId;
  installModelFetch(env, {
    modelId,
    onProgress: (load) => {
      post({ kind: 'progress', ...load });
    },
  });
  const precision = knownModel(modelId)?.precision ?? QUANTIZED_THROUGHOUT;
  const asked = await deviceFor(setup.compute);
  const [processor, tokenizer, running] = await Promise.all([
    AutoProcessor.from_pretrained(modelId),
    AutoTokenizer.from_pretrained(modelId),
    openOnDevice(asked, (on) =>
      AutoModel.from_pretrained(modelId, {
        device: on,
        dtype: { encoder_model: precision.encoder, decoder_model_merged: precision.decoder },
      }),
    ),
  ]);

  const sessions = running.opened.sessions as Record<string, InferenceSession | undefined>;
  const encoder = sessions.model;
  const decoder = sessions.decoder_model_merged;
  if (encoder === undefined || decoder === undefined) {
    throw new Error(`${modelId} did not load as an encoder and a decoder session`);
  }

  post({
    kind: 'opened',
    id,
    modelId,
    device: running.device,
    fellBackFrom: running.fellBackFrom,
  });

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

      const decoded: string = tokenizer.decode(tokens, { skip_special_tokens: true });
      return japaneseOcrText(decoded);
    },
  };
}

function sessionOnce(setup: RecognizerSetup, id: number): Promise<Session> {
  opening ??= openSession(setup, id).catch((cause: unknown): never => {
    opening = null;
    throw cause;
  });

  return opening;
}

async function open(id: number, setup: RecognizerSetup): Promise<void> {
  try {
    await sessionOnce(setup, id);
  } catch (cause) {
    post({ kind: 'failed', id, failure: 'model-unavailable', cause: describeCause(cause) });
  }
}

async function recognize(id: number, image: ImageBitmap): Promise<void> {
  try {
    const held = opening;
    if (held === null) {
      post({
        kind: 'failed',
        id,
        failure: 'model-unavailable',
        cause: 'The recognition model was not opened before this crop arrived',
      });
      return;
    }

    let session: Session;
    try {
      session = await held;
    } catch (cause) {
      post({ kind: 'failed', id, failure: 'model-unavailable', cause: describeCause(cause) });
      return;
    }

    try {
      const text = await session.read(image);
      post({ kind: 'recognized', id, text, confidence: null });
    } catch (cause) {
      post({ kind: 'failed', id, failure: 'recognition-failed', cause: describeCause(cause) });
    }
  } finally {
    image.close();
  }
}

scope.addEventListener('message', (event: MessageEvent<OcrRequest>) => {
  const request = event.data;
  if (request.kind === 'open') void open(request.id, request.setup);
  else void recognize(request.id, request.image);
});
