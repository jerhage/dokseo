import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tagId } from '$lib/shared/ids';
import type { StoredTag } from '../../domain/tag/tag';
import { createTagRepository } from './indexeddb-tags.repo';

const held = vi.hoisted(() => ({ rows: new Map<unknown, { id?: unknown }>() }));

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: () => Promise.resolve({}),
  listRecords: () => Promise.resolve([...held.rows.values()]),
  putRecord: (_db: unknown, _store: string, row: { id: unknown }) => {
    held.rows.set(row.id, row);
    return Promise.resolve();
  },
  deleteRecord: (_db: unknown, _store: string, key: unknown) => {
    held.rows.delete(key);
    return Promise.resolve();
  },
}));

const SFX: StoredTag = { id: 'sfx', name: 'sfx', colour: 'plum', createdAt: 2 };

const KEIGO: StoredTag = { id: 'keigo', name: 'keigo', colour: 'clay', createdAt: 1 };

const NAMELESS: StoredTag = { id: 'nameless', colour: 'sage', createdAt: 3 };

beforeEach(() => {
  held.rows.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createTagRepository', () => {
  it('lists the tags that read by name and reports a row without a name as unreadable', async () => {
    held.rows.set(SFX.id, SFX);
    held.rows.set(NAMELESS.id, NAMELESS);
    held.rows.set(KEIGO.id, KEIGO);

    const listed = await createTagRepository().list();

    expect(listed).toEqual({
      kind: 'success',
      tags: [KEIGO, SFX],
      unreadable: [{ id: 'nameless', name: null, stored: NAMELESS }],
    });
  });

  it('removes an unreadable row by its id without reading it', async () => {
    held.rows.set(NAMELESS.id, NAMELESS);
    const repository = createTagRepository();

    const removed = await repository.remove(tagId('nameless'));

    expect(removed).toEqual({ kind: 'success' });
    expect(await repository.list()).toEqual({ kind: 'success', tags: [], unreadable: [] });
  });
});
