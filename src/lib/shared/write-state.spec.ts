import { MutationObserver } from '@tanstack/svelte-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryFailure } from './query-failure';
import { IDLE, SAVING, writeStateOf } from './write-state';
import type { WriteState } from './write-state';
import { createTestQueryClient } from './testing/query-client';

describe('writeStateOf', () => {
  it('reports an idle mutation as idle', () => {
    expect(writeStateOf({ status: 'idle' })).toEqual({ kind: 'idle' });
  });

  it('reports a pending mutation as saving', () => {
    expect(writeStateOf({ status: 'pending' })).toEqual({ kind: 'saving' });
  });

  it.each([
    ['a query failure', new QueryFailure('denied'), 'denied'],
    ['a thrown value that is not a query failure', 'gone', 'Something went wrong: gone'],
  ])('reports an error from %s as failed with the described message', (_name, error, message) => {
    expect(writeStateOf({ status: 'error', error })).toEqual({ kind: 'failed', message });
  });

  it('reports a success as done with the result', () => {
    expect(writeStateOf({ status: 'success', data: 6 })).toEqual({ kind: 'done', result: 6 });
  });
});

interface PendingWrite {
  answer(value: number): void;
  refuse(cause: unknown): void;
}

const unsubscribes: (() => void)[] = [];

afterEach(() => {
  for (const unsubscribe of unsubscribes.splice(0)) unsubscribe();
});

function observeWrite() {
  const writes: PendingWrite[] = [];
  const observer = new MutationObserver<number, Error, number>(createTestQueryClient(), {
    mutationFn: () =>
      new Promise<number>((resolve, reject) => {
        writes.push({ answer: resolve, refuse: reject });
      }),
  });
  unsubscribes.push(observer.subscribe(() => undefined));

  return {
    writes,
    observer,
    state: (): WriteState<number> => writeStateOf(observer.getCurrentResult()),
    write(position: number): PendingWrite {
      const write = writes[position];
      if (write === undefined) throw new Error(`No write started at ${position}`);
      return write;
    },
  };
}

describe('writeStateOf over a MutationObserver', () => {
  it('reports idle, then saving, then done with the result', async () => {
    const write = observeWrite();
    expect(write.state()).toEqual(IDLE);

    const settled = write.observer.mutate(3).catch(() => undefined);
    await vi.waitFor(() => expect(write.state()).toEqual(SAVING));
    write.write(0).answer(6);
    await settled;

    await vi.waitFor(() => expect(write.state()).toEqual({ kind: 'done', result: 6 }));
  });

  it('reports failed with the described message when the write rejects', async () => {
    const write = observeWrite();

    const settled = write.observer.mutate(3).catch(() => undefined);
    await vi.waitFor(() => expect(write.writes).toHaveLength(1));
    write.write(0).refuse(new QueryFailure('The note could not be saved.'));
    await settled;

    await vi.waitFor(() =>
      expect(write.state()).toEqual({ kind: 'failed', message: 'The note could not be saved.' }),
    );
  });
});
