import { describe, expect, it } from 'vitest';
import type { QueryResult } from '../../../domain/indexeddb-format';
import type { QueryPresetKey } from '../../../domain/indexeddb-samples';
import { QueryLab } from './query-lab.svelte';
import type { QueryLabStore } from './query-lab.svelte';

function fakeStore(options: { readonly listing?: boolean; readonly failing?: string } = {}) {
  let exists = false;
  let captures = 0;
  const runs: QueryPresetKey[] = [];
  const store: QueryLabStore = {
    exists: () => Promise.resolve(options.listing === false ? null : exists),
    counts: () => Promise.resolve({ books: exists ? 3 : 0, captures }),
    fill: () => {
      if (options.failing !== undefined) return Promise.reject(new Error(options.failing));
      exists = true;
      captures = 8;
      return Promise.resolve();
    },
    run: (key) => {
      runs.push(key);
      const result: QueryResult = { kind: 'count', count: runs.length };
      return Promise.resolve(result);
    },
    clash: (note) => {
      note('add b4: success');
      note('add b5: error ConstraintError');
      note('transaction: abort (ConstraintError)');
      return Promise.resolve(3);
    },
    move: () => Promise.resolve(6),
    remove: () => {
      exists = false;
      captures = 0;
      return Promise.resolve();
    },
  };
  return { store, runs };
}

describe('QueryLab', () => {
  it('reports the database absent before it is filled', async () => {
    const lab = new QueryLab(fakeStore().store);

    await lab.refresh();

    expect(lab.state).toEqual({ kind: 'absent' });
  });

  it('fills the stores and runs the chosen query at once', async () => {
    const { store, runs } = fakeStore();
    const lab = new QueryLab(store);

    await lab.fill();

    expect(lab.state).toEqual({ kind: 'ready', counts: { books: 3, captures: 8 } });
    expect(runs).toEqual(['store-all']);
    expect(lab.shown?.preset).toBe('store-all');
  });

  it('remembers a choice made before the database exists and runs nothing', async () => {
    const { store, runs } = fakeStore();
    const lab = new QueryLab(store);

    await lab.refresh();
    await lab.choose('distinct');

    expect(lab.preset).toBe('distinct');
    expect(runs).toEqual([]);
  });

  it('runs a newly chosen query once the database is ready', async () => {
    const { store, runs } = fakeStore();
    const lab = new QueryLab(store);

    await lab.fill();
    await lab.choose('compound-range');

    expect(runs).toEqual(['store-all', 'compound-range']);
  });

  it('logs every step of the clashing transaction and the book count after it', async () => {
    const lab = new QueryLab(fakeStore().store);

    await lab.fill();
    await lab.clash();

    expect(lab.log).toEqual([
      'add b4: success',
      'add b5: error ConstraintError',
      'transaction: abort (ConstraintError)',
      'books in the store afterwards: 3',
    ]);
  });

  it('reports the database present without a listing once it has been filled', async () => {
    const lab = new QueryLab(fakeStore({ listing: false }).store);

    await lab.fill();

    expect(lab.state.kind).toBe('ready');
  });

  it('forgets the result when the database is deleted', async () => {
    const lab = new QueryLab(fakeStore().store);

    await lab.fill();
    await lab.remove();

    expect(lab.shown).toBeNull();
    expect(lab.state).toEqual({ kind: 'absent' });
  });

  it('reports a failure with its message and stops being busy', async () => {
    const lab = new QueryLab(fakeStore({ failing: 'The quota was exceeded' }).store);

    await lab.fill();

    expect(lab.state).toEqual({ kind: 'failed', message: 'The quota was exceeded' });
    expect(lab.busy).toBe(false);
  });
});
