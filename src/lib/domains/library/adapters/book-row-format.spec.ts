import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { layoutOf, READER_DATABASE } from '$lib/shared/testing/stored-format/database-layout';
import type { OpenedDatabase, Upgrade } from '$lib/shared/testing/stored-format/database-layout';
import {
  CONTINUOUS_BOOK_ROW,
  FLOW_BOOK_ROW,
  PAGED_BOOK_ROW,
} from '$lib/shared/testing/stored-format/library-rows';
import {
  formatChanged,
  schemaChanged,
  shapeOf,
  sortedKeys,
} from '$lib/shared/testing/stored-format/stored-shape';
import { bookId } from '$lib/shared/ids';
import { LANGUAGES, isLanguage } from '$lib/shared/language';
import {
  LAYOUT_KINDS,
  PAGE_PAIRING_CHOICE_VALUES,
  READING_DIRECTIONS,
  isLayoutKind,
  isPagePairingChoice,
  isReadingDirection,
} from '$lib/shared/layout-kind';
import { PAGE_FITS, isPageFit } from '$lib/shared/page-fit';
import { SOURCE_KINDS, isSourceKind } from '../domain/book/book';
import { INTRINSIC_ORDER } from '../domain/book/page-list';
import { bookFromStored } from '../domain/book/stored-book';
import { createLibraryRepository } from './indexeddb-opfs-library.repo';

const held = vi.hoisted(() => ({
  opened: [] as OpenedDatabase[],
  stores: new Map<string, Map<unknown, unknown>>(),
}));

type StoreWrite =
  | { readonly kind: 'put'; readonly store: string; readonly record: { readonly id: unknown } }
  | { readonly kind: 'delete'; readonly store: string; readonly key: unknown };

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
  writeRecords: (_db: unknown, writes: readonly StoreWrite[]) => {
    for (const write of writes) {
      if (write.kind === 'put') store(write.store).set(write.record.id, write.record);
      else store(write.store).delete(write.key);
    }
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

const BOOK_ROW_FIELDS = [
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
  'seriesId',
  'sourceKind',
  'title',
  'volume',
];

const PAGED_SHAPE = {
  addedAt: 'number',
  alias: 'string',
  contentHash: 'string',
  direction: 'string',
  fileName: 'string',
  finishedAt: 'null',
  id: 'string',
  imageCount: 'number',
  language: 'string',
  lastReadAt: 'number',
  layoutKind: 'string',
  pageFit: 'string',
  pagePairing: 'string',
  position: { index: 'number', kind: 'string', offset: 'number', shownThrough: 'number' },
  seriesId: 'string',
  sourceKind: 'string',
  title: 'string',
  volume: 'number',
};

const CONTINUOUS_SHAPE = {
  addedAt: 'number',
  alias: 'null',
  contentHash: 'string',
  direction: 'string',
  fileName: 'string',
  finishedAt: 'null',
  id: 'string',
  imageCount: 'number',
  language: 'string',
  lastReadAt: 'number',
  layoutKind: 'string',
  pageFit: 'string',
  pagePairing: 'string',
  position: { index: 'number', kind: 'string', offset: 'number', shownThrough: 'number' },
  seriesId: 'null',
  sourceKind: 'string',
  title: 'string',
  volume: 'null',
};

const FLOW_SHAPE = {
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
  position: { cfi: 'string', fraction: 'number', kind: 'string' },
  seriesId: 'null',
  sourceKind: 'string',
  title: 'string',
  volume: 'null',
};

const VARIANTS = [
  { name: 'a paged book at an image place', row: PAGED_BOOK_ROW, shape: PAGED_SHAPE },
  {
    name: 'a continuous book at an image place',
    row: CONTINUOUS_BOOK_ROW,
    shape: CONTINUOUS_SHAPE,
  },
  { name: 'a flow book at a text place', row: FLOW_BOOK_ROW, shape: FLOW_SHAPE },
] as const;

const BOOK_FORMAT_CHANGED = formatChanged('a book row');

const KNOWN_BOOK_VALUES = {
  language: ['en', 'ja', 'ko'],
  layoutKind: ['continuous', 'flow', 'paged'],
  direction: ['ltr', 'rtl'],
  pagePairing: ['auto', 'double', 'double-after-cover', 'single'],
  pageFit: ['height', 'width'],
  sourceKind: ['archive', 'epub', 'images', 'pdf'],
};

beforeEach(() => {
  held.stores.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the 1.x book row', () => {
  for (const { name, row } of VARIANTS) {
    it(`reads the frozen row of ${name} as exactly the same book`, () => {
      expect(bookFromStored(row), BOOK_FORMAT_CHANGED).toStrictEqual(row);
    });
  }

  for (const { name, row, shape } of VARIANTS) {
    it(`writes ${name} with exactly the 1.x fields and field types when it adds it`, async () => {
      await createLibraryRepository().add(
        bookFromStored(row),
        new Blob(['source']),
        null,
        INTRINSIC_ORDER,
        () => undefined,
      );

      const written = store('books').get(row.id);
      expect(written, BOOK_FORMAT_CHANGED).toStrictEqual(row);
      expect(sortedKeys(written ?? {}), BOOK_FORMAT_CHANGED).toStrictEqual(BOOK_ROW_FIELDS);
      expect(shapeOf(written), BOOK_FORMAT_CHANGED).toStrictEqual(shape);
    });
  }

  for (const { name, row, shape } of VARIANTS) {
    it(`writes ${name} with exactly the 1.x fields and field types when it saves an edit`, async () => {
      store('books').set(row.id, row);

      await createLibraryRepository().update(bookId(row.id), { direction: row.direction });

      const written = store('books').get(row.id);
      expect(written, BOOK_FORMAT_CHANGED).toStrictEqual(row);
      expect(shapeOf(written), BOOK_FORMAT_CHANGED).toStrictEqual(shape);
    });
  }

  it('holds exactly the 1.x values in each field read against a known set', () => {
    const defined = {
      language: LANGUAGES.toSorted(),
      layoutKind: LAYOUT_KINDS.toSorted(),
      direction: READING_DIRECTIONS.toSorted(),
      pagePairing: PAGE_PAIRING_CHOICE_VALUES.toSorted(),
      pageFit: PAGE_FITS.toSorted(),
      sourceKind: SOURCE_KINDS.toSorted(),
    };
    const read = {
      language: KNOWN_BOOK_VALUES.language.filter(isLanguage),
      layoutKind: KNOWN_BOOK_VALUES.layoutKind.filter(isLayoutKind),
      direction: KNOWN_BOOK_VALUES.direction.filter(isReadingDirection),
      pagePairing: KNOWN_BOOK_VALUES.pagePairing.filter(isPagePairingChoice),
      pageFit: KNOWN_BOOK_VALUES.pageFit.filter(isPageFit),
      sourceKind: KNOWN_BOOK_VALUES.sourceKind.filter(isSourceKind),
    };

    expect(defined, BOOK_FORMAT_CHANGED).toStrictEqual(KNOWN_BOOK_VALUES);
    expect(read, BOOK_FORMAT_CHANGED).toStrictEqual(KNOWN_BOOK_VALUES);
  });

  it('opens the reader database at the 1.x version with the 1.x stores', async () => {
    await createLibraryRepository().list();

    const [opened] = held.opened;
    expect(opened && layoutOf(opened), schemaChanged('reader')).toStrictEqual(READER_DATABASE);
  });
});
