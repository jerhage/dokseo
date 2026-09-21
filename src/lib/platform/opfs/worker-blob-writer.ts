import { match } from 'ts-pattern';
import { describeCause } from '$lib/shared/cause';
import type { OpfsWriteReply, OpfsWriteRequest } from '$workers/opfs-writer-protocol';

const UNREADABLE_REPLY = 'The storage worker sent a reply that could not be read';

type BytesWritten = (written: number, total: number) => void;

type BlobWrite = (name: string, blob: Blob, onWritten: BytesWritten) => Promise<void>;

type BlobWriterOptions = {
  readonly directory: string;
  readonly startWorker: () => Worker;
};

type Waiting = {
  readonly name: string;
  readonly onWritten: BytesWritten;
  readonly resolve: () => void;
  readonly reject: (failed: Error) => void;
};

function unwritten(name: string, cause: string): Error {
  return new Error(`Key "${name}" could not be written: ${cause}`, { cause });
}

function createBlobWriter(options: BlobWriterOptions): BlobWrite {
  const pending = new Map<number, Waiting>();

  let worker: Worker | null = null;
  let lastId = 0;

  function settle(id: number, finish: (waiting: Waiting) => void): void {
    const waiting = pending.get(id);
    if (waiting === undefined) return;

    pending.delete(id);
    finish(waiting);
  }

  function receive(reply: OpfsWriteReply): void {
    match(reply)
      .with({ kind: 'written' }, (progress) => {
        pending.get(progress.id)?.onWritten(progress.written, progress.total);
      })
      .with({ kind: 'done' }, (done) => {
        settle(done.id, (waiting) => {
          waiting.resolve();
        });
      })
      .with({ kind: 'failed' }, (failed) => {
        settle(failed.id, (waiting) => {
          waiting.reject(unwritten(waiting.name, failed.cause));
        });
      })
      .exhaustive();
  }

  function discard(cause: string): void {
    const stopping = worker;
    worker = null;

    const waiting = [...pending.values()];
    pending.clear();
    for (const one of waiting) one.reject(unwritten(one.name, cause));

    stopping?.terminate();
  }

  function writer(): Worker {
    if (worker !== null) return worker;

    const started = options.startWorker();
    started.addEventListener('message', (event: MessageEvent<OpfsWriteReply>) => {
      receive(event.data);
    });
    started.addEventListener('error', (event: ErrorEvent) => {
      discard(event.message);
    });
    started.addEventListener('messageerror', () => {
      discard(UNREADABLE_REPLY);
    });

    worker = started;
    return started;
  }

  return async (name, blob, onWritten) => {
    let target: Worker;
    try {
      target = writer();
    } catch (cause) {
      throw unwritten(name, describeCause(cause));
    }

    lastId += 1;
    const id = lastId;

    const written = new Promise<void>((resolve, reject) => {
      pending.set(id, { name, onWritten, resolve, reject });
    });

    const request: OpfsWriteRequest = {
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
      throw unwritten(name, describeCause(cause));
    }

    await written;
  };
}

export { createBlobWriter };
export type { BlobWrite, BlobWriterOptions, BytesWritten };
