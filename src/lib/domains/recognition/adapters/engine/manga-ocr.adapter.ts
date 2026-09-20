import type { TextRecognizer } from '../../domain/engine/text-recognizer';
import { createWorkerRecognizer } from './worker-recognizer';
import type { WorkerOcrOptions } from './worker-recognizer';

type MangaOcrOptions = WorkerOcrOptions;

function startOcrWorker(): Worker {
  return new Worker(new URL('$workers/ocr.worker.ts', import.meta.url), {
    type: 'module',
  });
}

function createMangaOcrRecognizer(options: MangaOcrOptions): TextRecognizer {
  return createWorkerRecognizer({
    ...options,
    id: 'manga-ocr',
    startWorker: options.startWorker ?? startOcrWorker,
  });
}

export { createMangaOcrRecognizer };
export type { MangaOcrOptions };
