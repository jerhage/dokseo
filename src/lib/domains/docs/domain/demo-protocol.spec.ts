import { describe, expect, it } from 'vitest';
import { ROOT_WORKER_SOURCE, rootReply } from './demo-protocol';

type FakeScope = { onmessage: ((event: { data: unknown }) => void) | null };

function loadedWorker() {
  const scope: FakeScope = { onmessage: null };
  const posted: unknown[] = [];
  const timers: (() => void)[] = [];
  const run = new Function('self', 'postMessage', 'setTimeout', ROOT_WORKER_SOURCE);
  run(
    scope,
    (message: unknown) => posted.push(message),
    (callback: () => void) => timers.push(callback),
  );
  const deliver = (data: unknown): void => scope.onmessage?.({ data });
  return { deliver, posted, timers };
}

describe('the square root worker source', () => {
  it('replies with the root after its delay, under the request id', () => {
    const worker = loadedWorker();

    worker.deliver({ kind: 'root', id: 4, value: 81, delayMs: 300 });
    expect(worker.posted).toEqual([]);
    for (const timer of worker.timers) timer();

    expect(worker.posted).toEqual([{ kind: 'rooted', id: 4, root: 9 }]);
  });

  it('replies with a failure for a negative value', () => {
    const worker = loadedWorker();

    worker.deliver({ kind: 'root', id: 2, value: -4, delayMs: 0 });
    for (const timer of worker.timers) timer();

    expect(worker.posted).toEqual([
      { kind: 'failed', id: 2, message: 'No real square root of -4' },
    ]);
  });

  it('throws out of the message handler on a crash request', () => {
    const worker = loadedWorker();

    expect(() => worker.deliver({ kind: 'crash' })).toThrow('no code for');
  });
});

describe('rootReply', () => {
  it('reads both replies', () => {
    expect(rootReply({ kind: 'rooted', id: 1, root: 3 })).toEqual({
      kind: 'rooted',
      id: 1,
      root: 3,
    });
    expect(rootReply({ kind: 'failed', id: 2, message: 'no' })).toEqual({
      kind: 'failed',
      id: 2,
      message: 'no',
    });
  });

  it('rejects anything else', () => {
    expect(rootReply(null)).toBeNull();
    expect(rootReply('rooted')).toBeNull();
    expect(rootReply({ kind: 'rooted', id: '1', root: 3 })).toBeNull();
    expect(rootReply({ kind: 'rooted', id: 1 })).toBeNull();
    expect(rootReply({ kind: 'other', id: 1 })).toBeNull();
  });
});
