import {
  chosenDevice,
  type ComputeChoice,
} from '$lib/domains/recognition/domain/engine/compute-choice';
import { SINGLE_GRAPH_FILE } from '$lib/domains/recognition/domain/model/model-weights';
import type { RecognizerSetup } from '$lib/domains/recognition/domain/engine/recognizer-setup';
import { describeCause } from '$lib/shared/cause';
import { characterDictionary, ctcLabels } from './character-dictionary';
import { ctcReading, joinedReading, type CtcLogits, type CtcReading } from './ctc-reading';
import { lineGeometry } from './line-geometry';
import { installModelFetch } from './model-fetch';
import type { OcrReply, OcrRequest } from './ocr-worker-protocol';
import { textLineBands, type TextBand } from './text-line-bands';

const DICTIONARY_FILE = 'inference.yml';

const CHANNELS = 3;

const MID_LEVEL = 0.5;

const FULL_LEVEL = 255;

type InferenceSession = {
  readonly outputNames: readonly string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, unknown>>;
};

type TensorOf = new (type: string, data: Float32Array, dims: readonly number[]) => object;

type Session = {
  read(image: ImageBitmap): Promise<CtcReading>;
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

function surfaceOf(width: number, height: number): OffscreenCanvasRenderingContext2D {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (context === null) {
    throw new Error(`A 2D drawing context was unavailable for a ${width}x${height} surface`);
  }
  return context;
}

function lumaOf(image: ImageBitmap): Uint8ClampedArray {
  const context = surfaceOf(image.width, image.height);
  context.drawImage(image, 0, 0);

  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  const luma = new Uint8ClampedArray(image.width * image.height);
  for (let at = 0; at < luma.length; at += 1) luma[at] = pixels[at * 4] ?? 0;

  return luma;
}

function bandPixels(image: ImageBitmap, band: TextBand): Float32Array {
  const height = band.bottom - band.top;
  const geometry = lineGeometry(image.width, height);
  const context = surfaceOf(geometry.drawnWidth, geometry.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    0,
    band.top,
    image.width,
    height,
    0,
    0,
    geometry.drawnWidth,
    geometry.height,
  );

  const pixels = context.getImageData(0, 0, geometry.drawnWidth, geometry.height).data;
  const plane = geometry.height * geometry.tensorWidth;
  const data = new Float32Array(CHANNELS * plane);

  for (let row = 0; row < geometry.height; row += 1) {
    for (let column = 0; column < geometry.drawnWidth; column += 1) {
      const from = (row * geometry.drawnWidth + column) * 4;
      const to = row * geometry.tensorWidth + column;
      const red = (pixels[from] ?? 0) / FULL_LEVEL;
      const green = (pixels[from + 1] ?? 0) / FULL_LEVEL;
      const blue = (pixels[from + 2] ?? 0) / FULL_LEVEL;
      data[to] = (blue - MID_LEVEL) / MID_LEVEL;
      data[plane + to] = (green - MID_LEVEL) / MID_LEVEL;
      data[2 * plane + to] = (red - MID_LEVEL) / MID_LEVEL;
    }
  }

  return data;
}

function dictionaryUrl(remoteHost: string, template: string, modelId: string): string {
  const path = template.replaceAll('{model}', modelId).replaceAll('{revision}', 'main');
  return `${remoteHost}${path}${DICTIONARY_FILE}`;
}

async function openSession(setup: RecognizerSetup, id: number): Promise<Session> {
  const { env, PretrainedConfig, PreTrainedModel, Tensor } =
    await import('@huggingface/transformers');
  env.allowLocalModels = false;

  const modelId = setup.modelId;
  installModelFetch(env, {
    modelId,
    onProgress: (load) => {
      post({ kind: 'progress', ...load });
    },
  });

  const device = await deviceFor(setup.compute);
  const url = dictionaryUrl(env.remoteHost, env.remotePathTemplate, modelId);
  const [config, model] = await Promise.all([
    env.fetch(url, { cache: 'force-cache' }).then((answer: Response) => answer.text()),
    PreTrainedModel.from_pretrained(modelId, {
      config: new PretrainedConfig({ model_type: 'custom' }),
      model_file_name: SINGLE_GRAPH_FILE,
      subfolder: '',
      device,
      dtype: 'fp32',
    }),
  ]);

  const labels = ctcLabels(characterDictionary(config));
  if (labels.length <= 2) {
    throw new Error(`${modelId} published no character dictionary in ${DICTIONARY_FILE}`);
  }

  const session = model.sessions.model as InferenceSession | undefined;
  if (session === undefined) throw new Error(`${modelId} did not load as a recognition session`);

  const output = session.outputNames[0];
  if (output === undefined) throw new Error(`${modelId} declares no output to read`);

  post({ kind: 'opened', id, modelId, device });

  const tensorOf = Tensor as unknown as TensorOf;

  return {
    async read(image: ImageBitmap): Promise<CtcReading> {
      const bands = textLineBands(lumaOf(image), image.width, image.height);
      const readings: CtcReading[] = [];

      for (const band of bands) {
        const height = band.bottom - band.top;
        const geometry = lineGeometry(image.width, height);
        const data = bandPixels(image, band);
        const answer = await session.run({
          x: new tensorOf('float32', data, [1, CHANNELS, geometry.height, geometry.tensorWidth]),
        });

        readings.push(ctcReading(answer[output] as CtcLogits, labels));
      }

      return joinedReading(readings);
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
      const reading = await session.read(image);
      post({ kind: 'recognized', id, text: reading.text, confidence: reading.confidence });
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
