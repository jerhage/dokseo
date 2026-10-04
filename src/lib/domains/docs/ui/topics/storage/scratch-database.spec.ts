import { describe, expect, it } from 'vitest';
import { SCRATCH_DATABASE } from './scratch-database';
import type { DatabaseListing, ScratchDatabaseStore, ScratchNote } from './scratch-database';
import { ScratchDatabase } from './scratch-database.svelte';

type FakeStore = ScratchDatabaseStore & { readonly removed: () => number };

function fakeStore(options: { readonly listing?: boolean; readonly failing?: string } = {}) {
  const appDatabases: DatabaseListing[] = [
    { name: 'reader', version: 3 },
    { name: 'recognition', version: 4 },
  ];
  let exists = false;
  let notes: ScratchNote[] = [];
  let removed = 0;

  const store: FakeStore = {
    databases: () =>
      Promise.resolve(
        options.listing === false
          ? null
          : [...appDatabases, ...(exists ? [{ name: SCRATCH_DATABASE, version: 1 }] : [])],
      ),
    open: () => {
      if (options.failing !== undefined) return Promise.reject(new Error(options.failing));
      const kind = exists ? 'opened' : 'created';
      exists = true;
      return Promise.resolve({ kind, version: 1 });
    },
    add: (text, savedAt) => {
      exists = true;
      notes = [...notes, { id: notes.length + 1, text, savedAt }];
      return Promise.resolve();
    },
    notes: () => Promise.resolve(notes),
    remove: () => {
      exists = false;
      notes = [];
      removed += 1;
      return Promise.resolve();
    },
    removed: () => removed,
  };
  return store;
}

function scratchOn(store: ScratchDatabaseStore): ScratchDatabase {
  return new ScratchDatabase({ store, now: () => 1_700_000_000_000 });
}

describe('ScratchDatabase', () => {
  it('reports the demo database absent until it is created, and lists the app databases', async () => {
    const scratch = scratchOn(fakeStore());

    await scratch.refresh();

    expect(scratch.state).toEqual({ kind: 'absent' });
    expect(scratch.appDatabases?.map((listing) => listing.name)).toEqual(['reader', 'recognition']);
  });

  it('logs the upgrade on the first open and a plain open after it', async () => {
    const scratch = scratchOn(fakeStore());

    await scratch.create();
    await scratch.create();

    expect(scratch.state).toEqual({ kind: 'present', notes: [] });
    expect(scratch.log[0]).toContain('no upgrade');
    expect(scratch.log[1]).toContain('upgradeneeded fired: version 0 to 1');
  });

  it('numbers each added note after the ones already stored', async () => {
    const scratch = scratchOn(fakeStore());

    await scratch.add();
    await scratch.add();

    expect(scratch.state.kind === 'present' ? scratch.state.notes.map((n) => n.text) : []).toEqual([
      'Demo note 1',
      'Demo note 2',
    ]);
  });

  it('removes the demo database and reports it absent again', async () => {
    const store = fakeStore();
    const scratch = scratchOn(store);

    await scratch.add();
    await scratch.remove();

    expect(store.removed()).toBe(1);
    expect(scratch.state).toEqual({ kind: 'absent' });
  });

  it('keeps the demo database present without a listing once it has been created', async () => {
    const scratch = scratchOn(fakeStore({ listing: false }));

    await scratch.create();

    expect(scratch.state).toEqual({ kind: 'present', notes: [] });
    expect(scratch.appDatabases).toBeNull();
  });

  it('reports a failed open with its message', async () => {
    const scratch = scratchOn(fakeStore({ failing: 'The quota was exceeded' }));

    await scratch.create();

    expect(scratch.state).toEqual({ kind: 'failed', message: 'The quota was exceeded' });
    expect(scratch.busy).toBe(false);
  });
});
