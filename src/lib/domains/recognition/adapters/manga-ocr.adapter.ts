import { match } from 'ts-pattern';
import { describeCause } from '$lib/shared/cause';
import { err, ok, type Result } from '$lib/shared/result';
import type { ModelLoad } from '../domain/model-load';
import { hasNoText, recognizedText, type RecognizedText } from '../domain/recognized-text';
import type { RecognizerSession } from '../domain/recognizer-session';
import type { RecognitionError, TextRecognizer } from '../domain/text-recognizer';
import type { OcrFailure, OcrReply, OcrRequest } from '../../../../workers/ocr-worker-protocol';

export type MangaOcrOptions = {
  readonly startWorker?: () => Worker;
  readonly onProgress?: (load: ModelLoad) => void;
  readonly onSession?: (session: RecognizerSession) => void;
};

type Recognition = Result<RecognizedText, RecognitionError>;

type Settle = (recognition: Recognition) => void;

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

export function createMangaOcrRecognizer(options: MangaOcrOptions = {}): TextRecognizer {
  const start = options.startWorker ?? startOcrWorker;
  const pending = new Map<number, Settle>();

  let worker: Worker | null = null;
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
        options.onProgress?.({ fraction: progress.fraction, source: progress.source });
      })
      .with({ kind: 'opened' }, (opened) => {
        options.onSession?.({ modelId: opened.modelId, device: opened.device });
      })
      .with({ kind: 'recognized' }, (recognized) => {
        settle(recognized.id, recognitionOf(recognized.text));
      })
      .with({ kind: 'failed' }, (failed) => {
        settle(failed.id, err(errorFor(failed.failure, failed.cause)));
      })
      .exhaustive();
  }

  function discard(cause: string): void {
    const running = worker;
    worker = null;

    const waiting = [...pending.values()];
    pending.clear();
    for (const settleOne of waiting) settleOne(err({ kind: 'recognition-failed', cause }));

    running?.terminate();
  }

  function workerOnce(): Worker {
    if (worker !== null) return worker;

    const started = start();
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
    return started;
  }

  function recognize(image: ImageBitmap): Promise<Recognition> {
    let target: Worker;
    try {
      target = workerOnce();
    } catch (cause) {
      return Promise.resolve(err({ kind: 'model-unavailable', cause: describeCause(cause) }));
    }

    let sent: ImageBitmap;
    try {
      sent = copyOf(image);
    } catch (cause) {
      return Promise.resolve(err({ kind: 'recognition-failed', cause: describeCause(cause) }));
    }

    lastId += 1;
    const id = lastId;
    const reply = new Promise<Recognition>((resolve) => {
      pending.set(id, resolve);
    });

    const request: OcrRequest = { kind: 'recognize', id, image: sent };
    target.postMessage(request, [sent]);
    return reply;
  }

  return { id: 'manga-ocr', recognize };
}
