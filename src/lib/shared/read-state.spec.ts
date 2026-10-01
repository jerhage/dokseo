import { describe, expect, it } from 'vitest';
import { LOADING, readFailed, readReady } from './read-state';
import type { ReadState } from './read-state';

describe('read states', () => {
  it('starts a read as loading', () => {
    const state: ReadState<number> = LOADING;

    expect(state).toEqual({ kind: 'loading' });
  });

  it('carries the failure message on the failed variant', () => {
    expect(readFailed('denied')).toEqual({ kind: 'failed', message: 'denied' });
  });

  it('carries the value on the ready variant', () => {
    const value = { books: 3 };

    expect(readReady(value)).toEqual({ kind: 'ready', value });
  });
});
