import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { StoredCapture } from '../../domain/capture/capture';
import { createCaptureRepository } from './indexeddb-captures.repo';

const held = vi.hoisted(() => ({ rows: new Map<unknown, { id?: unknown; bookId?: unknown }>() }));

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: () => Promise.resolve({}),
  listRecords: () => Promise.resolve([...held.rows.values()]),
  listByIndex: (_db: unknown, _store: string, _index: string, key: unknown) =>
    Promise.resolve([...held.rows.values()].filter((row) => row.bookId === key)),
  putRecord: (_db: unknown, _store: string, row: { id: unknown; bookId?: unknown }) => {
    held.rows.set(row.id, row);
    return Promise.resolve();
  },
  deleteRecord: (_db: unknown, _store: string, key: unknown) => {
    held.rows.delete(key);
    return Promise.resolve();
  },
  deleteByIndex: () => Promise.resolve(),
}));

const BOOK = bookId('book-one');

const REGIONS = [{ index: imageIndex(2), rect: imageRect(10, 20, 100, 40) }];

const GOOD: StoredCapture = {
  id: captureId('good'),
  bookId: BOOK,
  anchor: regionAnchor(REGIONS),
  text: 'こっちに来て',
  note: null,
  confidence: 0.9,
  createdAt: 1,
  editedAt: null,
  origin: 'recognized',
  tagIds: [],
};

const OLD_SHAPE = {
  id: 'old',
  bookId: BOOK,
  regions: REGIONS,
  text: 'そして',
  createdAt: 2,
};

beforeEach(() => {
  held.rows.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createCaptureRepository', () => {
  it.each([
    ['every capture', () => createCaptureRepository().listEverything()],
    ["a book's captures", () => createCaptureRepository().listForBook(BOOK)],
  ])(
    'lists the rows that read in %s and reports an old row without an anchor as unreadable',
    async (_, list) => {
      held.rows.set(GOOD.id, GOOD);
      held.rows.set(OLD_SHAPE.id, OLD_SHAPE);

      const listed = await list();

      expect(listed.kind === 'success' && listed.captures.map((row) => row.id)).toEqual(['good']);
      expect(listed.kind === 'success' && listed.unreadable).toEqual([{ id: 'old' }]);
    },
  );

  it('removes an unreadable row by its id without reading it', async () => {
    held.rows.set(OLD_SHAPE.id, OLD_SHAPE);
    const repository = createCaptureRepository();

    const removed = await repository.remove(captureId('old'));

    expect(removed).toEqual({ kind: 'success' });
    expect(await repository.listEverything()).toEqual({
      kind: 'success',
      captures: [],
      unreadable: [],
    });
  });
});
