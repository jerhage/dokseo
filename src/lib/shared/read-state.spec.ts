import { QueryObserver } from '@tanstack/svelte-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryFailure } from './query-failure';
import { LOADING, readFailed, readReady, readStateOf, reloadFailed, reloading } from './read-state';
import type { ReadState } from './read-state';
import { createTestQueryClient } from './testing/query-client';

describe('read states', () => {
  it('starts a read as loading', () => {
    const state: ReadState<number> = LOADING;

    expect(state).toEqual({ kind: 'loading' });
  });

  it('carries the failure message on the failed variant', () => {
    expect(readFailed('denied')).toEqual({ kind: 'failed', message: 'denied' });
  });

  it('carries the value on a settled ready variant', () => {
    const value = { books: 3 };

    expect(readReady(value)).toEqual({ kind: 'ready', value, refresh: { kind: 'settled' } });
  });
});

describe('reloading', () => {
  it('keeps the value it already holds and marks it refreshing', () => {
    expect(reloading(readReady(3))).toEqual({
      kind: 'ready',
      value: 3,
      refresh: { kind: 'refreshing' },
    });
  });

  it('loads afresh when it holds no value', () => {
    expect(reloading(LOADING)).toEqual({ kind: 'loading' });
    expect(reloading(readFailed('denied'))).toEqual({ kind: 'loading' });
  });
});

describe('reloadFailed', () => {
  it('keeps the value it already holds and carries the failure on the refresh', () => {
    expect(reloadFailed(reloading(readReady(3)), 'denied')).toEqual({
      kind: 'ready',
      value: 3,
      refresh: { kind: 'failed', message: 'denied' },
    });
  });

  it('fails the read when it holds no value', () => {
    expect(reloadFailed(LOADING, 'denied')).toEqual({ kind: 'failed', message: 'denied' });
  });
});

describe('readStateOf', () => {
  it('reports a pending query as loading', () => {
    expect(readStateOf({ status: 'pending' })).toEqual({ kind: 'loading' });
  });

  it('reports a load error as failed with the described message', () => {
    expect(
      readStateOf({ status: 'error', isLoadingError: true, error: new QueryFailure('denied') }),
    ).toEqual({ kind: 'failed', message: 'denied' });
  });

  it('describes a thrown value that is not a query failure', () => {
    expect(
      readStateOf({ status: 'error', isLoadingError: true, error: new TypeError('broken') }),
    ).toEqual({ kind: 'failed', message: 'Something went wrong: broken' });
  });

  it('keeps the data when a refetch fails', () => {
    expect(readStateOf({ status: 'error', isLoadingError: false, data: 3 })).toEqual(readReady(3));
  });

  it('reports a successful query as ready with its data', () => {
    expect(readStateOf({ status: 'success', data: 3 })).toEqual(readReady(3));
  });
});

interface PendingRead {
  answer(value: number): void;
  refuse(cause: unknown): void;
}

const unsubscribes: (() => void)[] = [];

afterEach(() => {
  for (const unsubscribe of unsubscribes.splice(0)) unsubscribe();
});

function observeRead() {
  const reads: PendingRead[] = [];
  const client = createTestQueryClient();
  const observer = new QueryObserver<number>(client, {
    queryKey: ['count'],
    queryFn: () =>
      new Promise<number>((resolve, reject) => {
        reads.push({ answer: resolve, refuse: reject });
      }),
  });
  unsubscribes.push(observer.subscribe(() => undefined));

  return {
    reads,
    observer,
    state: (): ReadState<number> => readStateOf(observer.getCurrentResult()),
    read(position: number): PendingRead {
      const read = reads[position];
      if (read === undefined) throw new Error(`No read started at ${position}`);
      return read;
    },
  };
}

describe('readStateOf over a QueryObserver', () => {
  it('reports loading, then ready once the read answers', async () => {
    const query = observeRead();

    expect(query.state()).toEqual({ kind: 'loading' });
    query.read(0).answer(3);
    await vi.waitFor(() => expect(query.state()).toEqual(readReady(3)));
  });

  it('reports failed with the described message when the first read rejects', async () => {
    const query = observeRead();

    query.read(0).refuse(new QueryFailure('The shelf could not be read.'));

    await vi.waitFor(() =>
      expect(query.state()).toEqual({ kind: 'failed', message: 'The shelf could not be read.' }),
    );
  });

  it('keeps the data on screen when a refetch rejects', async () => {
    const query = observeRead();
    query.read(0).answer(3);
    await vi.waitFor(() => expect(query.state()).toEqual(readReady(3)));

    const refetched = query.observer.refetch();
    await vi.waitFor(() => expect(query.reads).toHaveLength(2));
    query.read(1).refuse(new QueryFailure('denied'));
    await refetched;

    expect(query.observer.getCurrentResult().status).toBe('error');
    expect(query.state()).toEqual(readReady(3));
  });

  it('reads again on refetch and reports the new answer', async () => {
    const query = observeRead();
    query.read(0).answer(3);
    await vi.waitFor(() => expect(query.state()).toEqual(readReady(3)));

    const refetched = query.observer.refetch();
    await vi.waitFor(() => expect(query.reads).toHaveLength(2));
    query.read(1).answer(4);
    await refetched;

    await vi.waitFor(() => expect(query.state()).toEqual(readReady(4)));
  });
});
