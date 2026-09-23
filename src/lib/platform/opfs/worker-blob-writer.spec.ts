import { describe, expect, it } from 'vitest';
import type { OpfsWriteReply, OpfsWriteRequest } from '$workers/opfs-writer-protocol';
import { PRIVATE_WINDOW } from './directory';
import { createBlobWriter } from './worker-blob-writer';
import type { BlobWrite } from './worker-blob-writer';

type Listener = (event: unknown) => void;

type Progress = { readonly written: number; readonly total: number };

type Settled = { settled: boolean; cause: string | null };

type FakeWorker = {
  readonly sent: readonly OpfsWriteRequest[];
  readonly started: Worker;
  reply(reply: OpfsWriteReply): void;
  crash(message: string): void;
  stopped(): boolean;
};

function fakeWorker(): FakeWorker {
  const listeners = new Map<string, Listener[]>();
  const sent: OpfsWriteRequest[] = [];
  let stopped = false;

  const worker = {
    addEventListener(kind: string, listen: Listener): void {
      listeners.set(kind, [...(listeners.get(kind) ?? []), listen]);
    },
    postMessage(request: OpfsWriteRequest): void {
      sent.push(request);
    },
    terminate(): void {
      stopped = true;
    },
  };

  const tell = (kind: string, event: unknown): void => {
    for (const listen of listeners.get(kind) ?? []) listen(event);
  };

  return {
    sent,
    started: worker as unknown as Worker,
    reply: (reply) => {
      tell('message', { data: reply });
    },
    crash: (message) => {
      tell('error', { message });
    },
    stopped: () => stopped,
  };
}

function writerOn(workers: readonly FakeWorker[]): { write: BlobWrite; started: () => number } {
  let started = 0;

  const write = createBlobWriter({
    directory: 'blobs',
    startWorker: () => {
      const next = workers[started];
      if (next === undefined) throw new Error('No worker was left to start');
      started += 1;
      return next.started;
    },
  });

  return { write, started: () => started };
}

function watch(writing: Promise<void>): Settled {
  const state: Settled = { settled: false, cause: null };

  void writing.then(
    () => {
      state.settled = true;
    },
    (cause: unknown) => {
      state.settled = true;
      state.cause = cause instanceof Error ? cause.message : String(cause);
    },
  );

  return state;
}

function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('createBlobWriter', () => {
  it('sends the directory, the name and the blob the caller gave', async () => {
    const worker = fakeWorker();
    const { write } = writerOn([worker]);
    const blob = new Blob(['abc']);

    const writing = watch(write('book.src', blob, () => undefined));
    const request = worker.sent[0];

    expect(request).toMatchObject({ kind: 'write', directory: 'blobs', name: 'book.src', blob });
    expect(writing.settled).toBe(false);
  });

  it('keeps one worker across writes', async () => {
    const worker = fakeWorker();
    const { write, started } = writerOn([worker]);

    void write('one.src', new Blob(['a']), () => undefined);
    void write('two.cover', new Blob(['b']), () => undefined);
    await flush();

    expect(started()).toBe(1);
    expect(worker.sent).toHaveLength(2);
  });

  it('reports progress up to the total', async () => {
    const worker = fakeWorker();
    const { write } = writerOn([worker]);
    const seen: Progress[] = [];

    const writing = watch(
      write('book.src', new Blob(['abcdefghij']), (written, total) => {
        seen.push({ written, total });
      }),
    );

    const id = worker.sent[0]?.id ?? 0;
    worker.reply({ kind: 'written', id, written: 0, total: 10 });
    worker.reply({ kind: 'written', id, written: 4, total: 10 });
    worker.reply({ kind: 'written', id, written: 10, total: 10 });
    worker.reply({ kind: 'done', id });
    await flush();

    expect(seen).toEqual([
      { written: 0, total: 10 },
      { written: 4, total: 10 },
      { written: 10, total: 10 },
    ]);
    expect(writing).toEqual({ settled: true, cause: null });
  });

  it('names the key when the worker reports a failure', async () => {
    const worker = fakeWorker();
    const { write } = writerOn([worker]);

    const writing = watch(write('book.src', new Blob(['a']), () => undefined));
    worker.reply({ kind: 'failed', id: worker.sent[0]?.id ?? 0, cause: 'the quota ran out' });
    await flush();

    expect(writing).toEqual({
      settled: true,
      cause: 'Key "book.src" could not be written: the quota ran out',
    });
  });

  it('settles the write the reply names, and leaves the other waiting', async () => {
    const worker = fakeWorker();
    const { write } = writerOn([worker]);

    const source = watch(write('book.src', new Blob(['aaa']), () => undefined));
    const cover = watch(write('book.cover', new Blob(['b']), () => undefined));

    worker.reply({ kind: 'done', id: worker.sent[1]?.id ?? 0 });
    await flush();

    expect(cover).toEqual({ settled: true, cause: null });
    expect(source.settled).toBe(false);

    worker.reply({ kind: 'failed', id: worker.sent[0]?.id ?? 0, cause: 'the disk is full' });
    await flush();

    expect(source).toEqual({
      settled: true,
      cause: 'Key "book.src" could not be written: the disk is full',
    });
  });

  it('routes progress to the write that asked for it', async () => {
    const worker = fakeWorker();
    const { write } = writerOn([worker]);
    const source: Progress[] = [];
    const cover: Progress[] = [];

    void write('book.src', new Blob(['aaa']), (written, total) => {
      source.push({ written, total });
    });
    void write('book.cover', new Blob(['b']), (written, total) => {
      cover.push({ written, total });
    });

    worker.reply({ kind: 'written', id: worker.sent[1]?.id ?? 0, written: 1, total: 1 });
    await flush();

    expect(cover).toEqual([{ written: 1, total: 1 }]);
    expect(source).toEqual([]);
  });

  it('fails every write in flight when the worker itself errors', async () => {
    const [first, second] = [fakeWorker(), fakeWorker()];
    const { write, started } = writerOn([first, second]);

    const source = watch(write('book.src', new Blob(['a']), () => undefined));
    const cover = watch(write('book.cover', new Blob(['b']), () => undefined));

    first.crash('the storage worker died');
    await flush();

    expect([source.cause, cover.cause]).toEqual([
      'Key "book.src" could not be written: the storage worker died',
      'Key "book.cover" could not be written: the storage worker died',
    ]);
    expect(first.stopped()).toBe(true);

    void write('again.src', new Blob(['c']), () => undefined);
    await flush();

    expect(started()).toBe(2);
  });

  it('names the key when no worker can be started', async () => {
    const { write } = writerOn([]);
    const writing = watch(write('book.src', new Blob(['a']), () => undefined));
    await flush();

    expect(writing).toEqual({
      settled: true,
      cause: 'Key "book.src" could not be written: No worker was left to start',
    });
  });
});

describe('a private window that refuses the file system', () => {
  it('says so plainly, without the key nobody asked about', async () => {
    const worker = fakeWorker();
    const { write } = writerOn([worker]);

    const writing = write('7ccc3a16.src', new Blob(['x']), () => undefined);
    worker.reply({ kind: 'failed', id: worker.sent[0]!.id, cause: PRIVATE_WINDOW });

    await expect(writing).rejects.toThrow(PRIVATE_WINDOW);
    await expect(writing).rejects.not.toThrow('could not be written');
  });
});
