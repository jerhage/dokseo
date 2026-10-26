import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangeMarker } from '$lib/shared/change-marker';
import { tagId } from '$lib/shared/ids';
import { tagFromStored } from '../../domain/tag/tag';
import type { StoredTag } from '../../domain/tag/tag';
import { createTagRepository } from './indexeddb-tags.repo';

type HeldWrite =
  | { readonly kind: 'put'; readonly store: string; readonly record: { readonly id: unknown } }
  | { readonly kind: 'delete'; readonly store: string; readonly key: unknown }
  | { readonly kind: 'mark'; readonly marker: ChangeMarker };

const held = vi.hoisted(() => ({
  rows: new Map<unknown, { id?: unknown }>(),
  outbox: new Map<string, ChangeMarker>(),
}));

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: () => Promise.resolve({}),
  listRecords: () => Promise.resolve([...held.rows.values()]),
  writeRecords: (_db: unknown, writes: readonly HeldWrite[]) => {
    for (const write of writes) {
      if (write.kind === 'mark') {
        held.outbox.set(`${write.marker.kind}:${write.marker.recordId}`, write.marker);
      } else if (write.kind === 'put') held.rows.set(write.record.id, write.record);
      else held.rows.delete(write.key);
    }
    return Promise.resolve();
  },
}));

const SFX: StoredTag = { id: 'sfx', name: 'sfx', colour: 'plum', createdAt: 2 };

const KEIGO: StoredTag = { id: 'keigo', name: 'keigo', colour: 'clay', createdAt: 1 };

const NAMELESS: StoredTag = { id: 'nameless', colour: 'sage', createdAt: 3 };

beforeEach(() => {
  held.rows.clear();
  held.outbox.clear();
  vi.stubGlobal('indexedDB', {});
  vi.useFakeTimers();
  vi.setSystemTime(1000);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
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

  it('marks a saved tag in the outbox under its id', async () => {
    await createTagRepository().save(tagFromStored(SFX));

    expect([...held.outbox.values()]).toEqual([
      { kind: 'tag', recordId: 'sfx', deleted: false, at: 1000, changeId: expect.any(String) },
    ]);
  });

  it('overwrites the marker of a tag saved twice so one marker remains', async () => {
    const repository = createTagRepository();
    await repository.save(tagFromStored(SFX));
    vi.setSystemTime(2000);

    await repository.save(tagFromStored(SFX));

    expect([...held.outbox.values()]).toEqual([
      { kind: 'tag', recordId: 'sfx', deleted: false, at: 2000, changeId: expect.any(String) },
    ]);
  });

  it('leaves a deleted marker when a tag is removed', async () => {
    const repository = createTagRepository();
    await repository.save(tagFromStored(SFX));

    await repository.remove(tagId('sfx'));

    expect([...held.outbox.values()]).toEqual([
      { kind: 'tag', recordId: 'sfx', deleted: true, at: 1000, changeId: expect.any(String) },
    ]);
  });

  it('writes no marker when the repository is built unmarked', async () => {
    const repository = createTagRepository('unmarked');

    await repository.save(tagFromStored(SFX));
    await repository.remove(tagId('sfx'));

    expect(held.outbox.size).toBe(0);
  });
});
