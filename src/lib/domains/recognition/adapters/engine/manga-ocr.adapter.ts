import type { TextRecognizer } from '../../domain/engine/text-recognizer';
import { createWorkerRecognizer, type WorkerOcrOptions } from './worker-recognizer';

export type MangaOcrOptions = WorkerOcrOptions;

function startOcrWorker(): Worker {
  return new Worker(new URL('$workers/ocr.worker.ts', import.meta.url), {
    type: 'module',
  });
}

export function createMangaOcrRecognizer(options: MangaOcrOptions): TextRecognizer {
  return createWorkerRecognizer({
    ...options,
    id: 'manga-ocr',
    startWorker: options.startWorker ?? startOcrWorker,
  });
}
