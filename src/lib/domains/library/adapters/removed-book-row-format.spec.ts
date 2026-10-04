import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { layoutOf, READER_DATABASE } from '$lib/shared/testing/stored-format/database-layout';
import type { OpenedDatabase, Upgrade } from '$lib/shared/testing/stored-format/database-layout';
import {
  REMOVED_FLOW_BOOK_ROW,
  REMOVED_PAGED_BOOK_ROW,
} from '$lib/shared/testing/stored-format/library-rows';
import {
  formatChanged,
  schemaChanged,
  shapeOf,
  sortedKeys,
} from '$lib/shared/testing/stored-format/stored-shape';
import { bookId } from '$lib/shared/ids';
import { removedBookFromStored } from '../domain/book/removed-book';
import { createLibraryRepository } from './indexeddb-opfs-library.repo';

const held = vi.hoisted(() => ({
  opened: [] as OpenedDatabase[],
  stores: new Map<string, Map<unknown, unknown>>(),
}));

function store(name: string): Map<unknown, unknown> {
  const found = held.stores.get(name);
  if (found !== undefined) return found;
  const created = new Map<unknown, unknown>();
  held.stores.set(name, created);
  return created;
}

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: (name: string, version: number, upgrade: Upgrade) => {
    held.opened.push({ name, version, upgrade });
    return Promise.resolve({});
  },
  listRecords: (_db: unknown, name: string) => Promise.resolve([...store(name).values()]),
  getRecord: (_db: unknown, name: string, key: unknown) => Promise.resolve(store(name).get(key)),
  putRecord: (_db: unknown, name: string, row: { id: unknown }) => {
    store(name).set(row.id, row);
    return Promise.resolve();
  },
  deleteRecord: (_db: unknown, name: string, key: unknown) => {
    store(name).delete(key);
    return Promise.resolve();
  },
}));

vi.mock('$lib/platform/opfs/blob-store', () => ({
  isAvailable: () => true,
  get: () => Promise.resolve(null),
  put: () => Promise.resolve(),
  remove: () => Promise.resolve(),
  totalBytes: () => Promise.resolve(0),
}));

const REMOVED_ROW_FIELDS = [
  'addedAt',
  'alias',
  'contentHash',
  'direction',
  'fileName',
  'finishedAt',
  'id',
  'imageCount',
  'language',
  'lastReadAt',
  'layoutKind',
  'pageFit',
  'pagePairing',
  'position',
  'removedAt',
  'seriesId',
  'sourceKind',
  'title',
  'volume',
];

const REMOVED_PAGED_SHAPE = {
  addedAt: 'number',
  alias: 'null',
  contentHash: 'string',
  direction: 'string',
  fileName: 'string',
  finishedAt: 'number',
  id: 'string',
  imageCount: 'number',
  language: 'string',
  lastReadAt: 'number',
  layoutKind: 'string',
  pageFit: 'string',
  pagePairing: 'string',
  position: { index: 'number', kind: 'string', offset: 'number', shownThrough: 'number' },
  removedAt: 'number',
  seriesId: 'string',
  sourceKind: 'string',
  title: 'string',
  volume: 'number',
};

const REMOVED_FLOW_SHAPE = {
  addedAt: 'number',
  alias: 'string',
  contentHash: 'string',
  direction: 'string',
  fileName: 'string',
  finishedAt: 'null',
  id: 'string',
  imageCount: 'number',
  language: 'string',
  lastReadAt: 'null',
  layoutKind: 'string',
  pageFit: 'string',
  pagePairing: 'string',
  position: { cfi: 'string', fraction: 'null', kind: 'string' },
  removedAt: 'number',
  seriesId: 'null',
  sourceKind: 'string',
  title: 'string',
  volume: 'null',
};

const VARIANTS = [
  {
    name: 'a removed paged book at an image place',
    row: REMOVED_PAGED_BOOK_ROW,
    shape: REMOVED_PAGED_SHAPE,
  },
  {
    name: 'a removed flow book at a text place',
    row: REMOVED_FLOW_BOOK_ROW,
    shape: REMOVED_FLOW_SHAPE,
  },
] as const;

const REMOVED_FORMAT_CHANGED = formatChanged('a removed-book record');

function shelfRowOf<T extends { readonly removedAt: number }>(row: T): Omit<T, 'removedAt'> {
  const { removedAt: _removedAt, ...shelved } = row;
  return shelved;
}

beforeEach(() => {
  held.stores.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the 1.x removed-book record', () => {
  for (const { name, row } of VARIANTS) {
    it(`reads the frozen record of ${name} as exactly the same record`, () => {
      expect(removedBookFromStored(row), REMOVED_FORMAT_CHANGED).toStrictEqual(row);
    });
  }

  for (const { name, row, shape } of VARIANTS) {
    it(`writes ${name} with exactly the 1.x fields and field types when it removes the book`, async () => {
      store('books').set(row.id, shelfRowOf(row));

      await createLibraryRepository().remove(bookId(row.id), row.removedAt);

      const written = store('removed-books').get(row.id);
      expect(written, REMOVED_FORMAT_CHANGED).toStrictEqual(row);
      expect(sortedKeys(written ?? {}), REMOVED_FORMAT_CHANGED).toStrictEqual(REMOVED_ROW_FIELDS);
      expect(shapeOf(written), REMOVED_FORMAT_CHANGED).toStrictEqual(shape);
    });
  }

  for (const { name, row, shape } of VARIANTS) {
    it(`writes ${name} with exactly the 1.x fields and field types when an import adds the record`, async () => {
      await createLibraryRepository().addRemoved(removedBookFromStored(row));

      const written = store('removed-books').get(row.id);
      expect(written, REMOVED_FORMAT_CHANGED).toStrictEqual(row);
      expect(shapeOf(written), REMOVED_FORMAT_CHANGED).toStrictEqual(shape);
    });
  }

  it('opens the reader database at the 1.x version with the 1.x stores', async () => {
    await createLibraryRepository().listRemoved();

    const [opened] = held.opened;
    expect(opened && layoutOf(opened), schemaChanged('reader')).toStrictEqual(READER_DATABASE);
  });
});
