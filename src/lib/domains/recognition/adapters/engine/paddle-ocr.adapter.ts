import type { TextRecognizer } from '../../domain/engine/text-recognizer';
import { createWorkerRecognizer } from './worker-recognizer';
import type { WorkerOcrOptions } from './worker-recognizer';

export type PaddleOcrOptions = WorkerOcrOptions;

function startPaddleOcrWorker(): Worker {
  return new Worker(new URL('$workers/paddle-ocr.worker.ts', import.meta.url), {
    type: 'module',
  });
}

export function createPaddleOcrRecognizer(options: PaddleOcrOptions): TextRecognizer {
  return createWorkerRecognizer({
    ...options,
    id: 'paddle-ocr',
    startWorker: options.startWorker ?? startPaddleOcrWorker,
  });
}
