import { match } from 'ts-pattern';
import { describeCause } from '$lib/shared/cause';
import { err, ok, type Result } from '$lib/shared/result';
import type { ModelLoad, ModelLoadError } from '../domain/model-load';
import { hasNoText, recognizedText, type RecognizedText } from '../domain/recognized-text';
import type { RecognizerSession } from '../domain/recognizer-session';
import type { RecognizerSetup } from '../domain/recognizer-setup';
import type { RecognitionError, TextRecognizer } from '../domain/text-recognizer';
import type { OcrFailure, OcrReply, OcrRequest } from '../../../../workers/ocr-worker-protocol';

export type MangaOcrOptions = {
  readonly readSetup: () => Promise<RecognizerSetup | null>;
  readonly startWorker?: () => Worker;
  readonly onProgress?: (load: ModelLoad) => void;
  readonly onSession?: (session: RecognizerSession) => void;
};

type Recognition = Result<RecognizedText, RecognitionError>;

type Opening = Result<RecognizerSession, ModelLoadError>;

type Settle = (recognition: Recognition) => void;

const NOT_CONFIGURED = 'No recognition model is configured for this language';

const CANCELLED = 'The recognition model load was cancelled';

function startOcrWorker(): Worker {
  return new Worker(new URL('../../../../workers/ocr.worker.ts', import.meta.url), {
    type: 'module',
  });
}

function copyOf(image: ImageBitmap): ImageBitmap {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error(
      `A 2D drawing context was unavailable for a ${image.width}x${image.height} crop`,
    );
  }

  context.drawImage(image, 0, 0);
  return canvas.transferToImageBitmap();
}

function errorFor(failure: OcrFailure, cause: string): RecognitionError {
  return failure === 'model-unavailable'
    ? { kind: 'model-unavailable', cause }
    : { kind: 'recognition-failed', cause };
}

function recognitionOf(text: string): Recognition {
  const recognized = recognizedText(text);
  return hasNoText(recognized) ? err({ kind: 'no-text' }) : ok(recognized);
}

function unreadable(error: ModelLoadError): RecognitionError {
  return match(error)
    .with({ kind: 'cancelled' }, (): RecognitionError => ({
      kind: 'model-unavailable',
      cause: CANCELLED,
    }))
    .with({ kind: 'unavailable' }, (blocked): RecognitionError => ({
      kind: 'model-unavailable',
      cause: blocked.cause,
    }))
    .exhaustive();
}

export function createMangaOcrRecognizer(options: MangaOcrOptions): TextRecognizer {
  const start = options.startWorker ?? startOcrWorker;
  const pending = new Map<number, Settle>();

  let worker: Worker | null = null;
  let starting: Promise<Opening> | null = null;
  let settleOpening: ((opened: Opening) => void) | null = null;
  let openId = 0;
  let lastId = 0;

  function settle(id: number, recognition: Recognition): void {
    const waiting = pending.get(id);
    if (waiting === undefined) return;

    pending.delete(id);
    waiting(recognition);
  }

  function receive(reply: OcrReply): void {
    match(reply)
      .with({ kind: 'progress' }, (progress) => {
        options.onProgress?.({
          fraction: progress.fraction,
          source: progress.source,
          loadedBytes: progress.loadedBytes,
          totalBytes: progress.totalBytes,
        });
      })
      .with({ kind: 'opened' }, (opened) => {
        const session: RecognizerSession = { modelId: opened.modelId, device: opened.device };
        options.onSession?.(session);
        if (opened.id === openId) finishOpening(ok(session));
      })
      .with({ kind: 'recognized' }, (recognized) => {
        settle(recognized.id, recognitionOf(recognized.text));
      })
      .with({ kind: 'failed' }, (failed) => {
        if (failed.id === openId && settleOpening !== null) {
          finishOpening(err({ kind: 'unavailable', cause: failed.cause }));
          return;
        }

        settle(failed.id, err(errorFor(failed.failure, failed.cause)));
      })
      .exhaustive();
  }

  function finishOpening(opened: Opening): void {
    const waiting = settleOpening;
    settleOpening = null;
    if (waiting === null) return;

    if (!opened.ok) forget(null);
    waiting(opened);
  }

  function forget(cause: string | null): void {
    const running = worker;
    worker = null;
    starting = null;

    if (cause !== null) {
      const waiting = [...pending.values()];
      pending.clear();
      for (const settleOne of waiting) settleOne(err({ kind: 'recognition-failed', cause }));
    }

    running?.terminate();
  }

  function discard(cause: string): void {
    finishOpening(err({ kind: 'unavailable', cause }));
    forget(cause);
  }

  async function begin(): Promise<Opening> {
    const setup = await options.readSetup();
    if (setup === null) return err({ kind: 'unavailable', cause: NOT_CONFIGURED });

    let started: Worker;
    try {
      started = start();
    } catch (cause) {
      starting = null;
      return err({ kind: 'unavailable', cause: describeCause(cause) });
    }

    started.addEventListener('message', (event: MessageEvent<OcrReply>) => {
      receive(event.data);
    });
    started.addEventListener('error', (event: ErrorEvent) => {
      discard(event.message);
    });
    started.addEventListener('messageerror', () => {
      discard('The OCR worker sent a reply that could not be read');
    });

    worker = started;
    lastId += 1;
    openId = lastId;

    const opened = new Promise<Opening>((resolve) => {
      settleOpening = resolve;
    });

    const request: OcrRequest = { kind: 'open', id: openId, setup };
    started.postMessage(request, []);
    return await opened;
  }

  function prepare(): Promise<Opening> {
    starting ??= begin();
    return starting;
  }

  function cancel(): void {
    finishOpening(err({ kind: 'cancelled' }));
    forget(CANCELLED);
  }

  async function recognize(image: ImageBitmap): Promise<Recognition> {
    const opened = await prepare();
    if (!opened.ok) return err(unreadable(opened.error));

    const target = worker;
    if (target === null) return err({ kind: 'model-unavailable', cause: CANCELLED });

    let sent: ImageBitmap;
    try {
      sent = copyOf(image);
    } catch (cause) {
      return err({ kind: 'recognition-failed', cause: describeCause(cause) });
    }

    lastId += 1;
    const id = lastId;
    const reply = new Promise<Recognition>((resolve) => {
      pending.set(id, resolve);
    });

    const request: OcrRequest = { kind: 'recognize', id, image: sent };
    target.postMessage(request, [sent]);
    return await reply;
  }

  return { id: 'manga-ocr', prepare, cancel, recognize };
}
