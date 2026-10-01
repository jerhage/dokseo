import { describe, expect, it } from 'vitest';
import { LOADING, readFailed, readReady, reloadFailed, reloading } from './read-state';
import type { ReadState } from './read-state';

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
