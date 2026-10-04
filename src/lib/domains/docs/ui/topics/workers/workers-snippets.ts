import type { SourceSnippet } from '../ocr/ocr-snippets';

const START_OCR_WORKER: SourceSnippet = {
  label: 'manga-ocr.adapter.ts starts its worker',
  file: 'src/lib/domains/recognition/adapters/engine/manga-ocr.adapter.ts',
  code: `function startOcrWorker(): Worker {
  return new Worker(new URL('$workers/ocr.worker.ts', import.meta.url), {
    type: 'module',
  });
}`,
};

const WORKER_SCOPE: SourceSnippet = {
  label: 'The worker types its own global, in ocr.worker.ts',
  file: 'src/workers/ocr.worker.ts',
  code: `type WorkerScope = {
  postMessage(reply: OcrReply): void;
  addEventListener(kind: 'message', listen: (event: MessageEvent<OcrRequest>) => void): void;
};

function workerScope(): WorkerScope {
  return self as unknown as WorkerScope;
}`,
};

const OCR_REQUEST: SourceSnippet = {
  label: 'The requests, in src/workers/ocr-worker-protocol.ts',
  file: 'src/workers/ocr-worker-protocol.ts',
  code: `type OcrRequest =
  | { readonly kind: 'open'; readonly id: number; readonly setup: RecognizerSetup }
  | { readonly kind: 'recognize'; readonly id: number; readonly image: ImageBitmap };`,
};

const OCR_FAILED_REPLY: SourceSnippet = {
  label: 'The failure reply, in the same file',
  file: 'src/workers/ocr-worker-protocol.ts',
  code: `| {
    readonly kind: 'failed';
    readonly id: number;
    readonly failure: OcrFailure;
    readonly cause: string;
  };`,
};

const OCR_WORKER_LISTENER: SourceSnippet = {
  label: 'The end of ocr.worker.ts',
  file: 'src/workers/ocr.worker.ts',
  code: `scope.addEventListener('message', (event: MessageEvent<OcrRequest>) => {
  const request = event.data;
  if (request.kind === 'open') void open(request.id, request.setup);
  else void recognize(request.id, request.image);
});`,
};

const RECOGNIZER_LISTENERS: SourceSnippet = {
  label: 'worker-recognizer.ts listens for replies and for failures',
  file: 'src/lib/domains/recognition/adapters/engine/worker-recognizer.ts',
  code: `started.addEventListener('message', (event: MessageEvent<OcrReply>) => {
  receive(event.data);
});
started.addEventListener('error', (event: ErrorEvent) => {
  discard(event.message);
});
started.addEventListener('messageerror', () => {
  discard('The OCR worker sent a reply that could not be read');
});`,
};

const RECOGNIZER_SEND: SourceSnippet = {
  label: 'Sending a crop, in worker-recognizer.ts',
  file: 'src/lib/domains/recognition/adapters/engine/worker-recognizer.ts',
  code: `using prepared = preparedFor(beginTrace, image, preparation);

lastId += 1;
const id = lastId;
const sent = prepared.bitmap;
const request: OcrRequest = { kind: 'recognize', id, image: sent };
target.postMessage(request, [sent]);
prepared.release();

return await new Promise<Recognition>((resolve) => {
  pending.set(id, resolve);
});`,
};

const WORKER_CLOSES_CROP: SourceSnippet = {
  label: 'The worker closes the crop it received, in ocr.worker.ts',
  file: 'src/workers/ocr.worker.ts',
  code: `  try {
    const text = await readOnAProvenDevice(session, image);
    post({ kind: 'recognized', id, text, confidence: null });
  } catch (cause) {
    post({ kind: 'failed', id, failure: 'recognition-failed', cause: describeCause(cause) });
  }
} finally {
  image.close();
}`,
};

const WRITER_POST: SourceSnippet = {
  label: 'Posting a Blob to the writer, in worker-blob-writer.ts',
  file: 'src/lib/platform/opfs/worker-blob-writer.ts',
  code: `const request: OpfsWriteRequest = {
  kind: 'write',
  id,
  directory: options.directory,
  name,
  blob,
};

try {
  target.postMessage(request, []);
} catch (cause) {
  pending.delete(id);
  throw unwritten(name, cause);
}`,
};

const WRITER_QUEUE: SourceSnippet = {
  label: 'The writer runs one write at a time, in opfs-writer.worker.ts',
  file: 'src/workers/opfs-writer.worker.ts',
  code: `let queued: Promise<void> = Promise.resolve();

scope.addEventListener('message', (event: MessageEvent<OpfsWriteRequest>) => {
  queued = queued.then(() => run(event.data));
});`,
};

const WORKERS_SNIPPETS: readonly SourceSnippet[] = [
  START_OCR_WORKER,
  WORKER_SCOPE,
  OCR_REQUEST,
  OCR_FAILED_REPLY,
  OCR_WORKER_LISTENER,
  RECOGNIZER_LISTENERS,
  RECOGNIZER_SEND,
  WORKER_CLOSES_CROP,
  WRITER_POST,
  WRITER_QUEUE,
];

export {
  OCR_FAILED_REPLY,
  OCR_REQUEST,
  OCR_WORKER_LISTENER,
  RECOGNIZER_LISTENERS,
  RECOGNIZER_SEND,
  START_OCR_WORKER,
  WORKERS_SNIPPETS,
  WORKER_CLOSES_CROP,
  WORKER_SCOPE,
  WRITER_POST,
  WRITER_QUEUE,
};
