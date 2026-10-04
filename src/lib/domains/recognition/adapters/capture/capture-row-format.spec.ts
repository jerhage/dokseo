import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { layoutOf, RECOGNITION_DATABASE } from '$lib/shared/testing/stored-format/database-layout';
import type { OpenedDatabase, Upgrade } from '$lib/shared/testing/stored-format/database-layout';
import {
  LIFTED_CAPTURE_ROW,
  RECOGNIZED_CAPTURE_ROW,
  SCORED_CAPTURE_ROW,
  WRITTEN_CAPTURE_ROW,
} from '$lib/shared/testing/stored-format/recognition-rows';
import {
  formatChanged,
  schemaChanged,
  shapeOf,
  sortedKeys,
} from '$lib/shared/testing/stored-format/stored-shape';
import { captureFromStored } from '../../domain/capture/capture';
import { createCaptureRepository } from './indexeddb-captures.repo';

type HeldRow = { readonly id: unknown; readonly bookId?: unknown };

const held = vi.hoisted(() => ({
  opened: [] as OpenedDatabase[],
  rows: new Map<unknown, HeldRow>(),
}));

vi.mock('$lib/platform/idb/connection', () => ({
  openDatabase: (name: string, version: number, upgrade: Upgrade) => {
    held.opened.push({ name, version, upgrade });
    return Promise.resolve({});
  },
  listRecords: () => Promise.resolve([...held.rows.values()]),
  putRecord: (_db: unknown, _store: string, row: HeldRow) => {
    held.rows.set(row.id, row);
    return Promise.resolve();
  },
  rewriteByIndex: (
    _db: unknown,
    _store: string,
    _index: string,
    key: unknown,
    rewrite: (row: HeldRow) => HeldRow,
  ) => {
    for (const row of [...held.rows.values()].filter((stored) => stored.bookId === key)) {
      held.rows.set(row.id, rewrite(row));
    }
    return Promise.resolve();
  },
}));

const REGION = {
  index: 'number',
  rect: { height: 'number', width: 'number', x: 'number', y: 'number' },
};

const RECOGNIZED_SHAPE = {
  anchor: { kind: 'string', regions: [REGION] },
  bookId: 'string',
  confidence: 'null',
  createdAt: 'number',
  editedAt: 'number',
  id: 'string',
  note: 'string',
  origin: 'string',
  tagIds: ['string', 'string'],
  text: 'string',
};

const SCORED_SHAPE = {
  anchor: { kind: 'string', regions: [REGION, REGION] },
  bookId: 'string',
  confidence: 'number',
  createdAt: 'number',
  editedAt: 'null',
  id: 'string',
  note: 'null',
  origin: 'string',
  tagIds: [],
  text: 'string',
};

const WRITTEN_SHAPE = {
  anchor: { kind: 'string', regions: [REGION] },
  bookId: 'string',
  createdAt: 'number',
  editedAt: 'null',
  id: 'string',
  origin: 'string',
  tagIds: ['string'],
  text: 'string',
};

const LIFTED_SHAPE = {
  anchor: {
    cfi: 'string',
    chapter: 'string',
    kind: 'string',
    quote: { exact: 'string', prefix: 'string', suffix: 'string' },
  },
  bookId: 'string',
  createdAt: 'number',
  editedAt: 'null',
  id: 'string',
  note: 'null',
  origin: 'string',
  tagIds: [],
  text: 'string',
};

const RECOGNIZED_FIELDS = [
  'anchor',
  'bookId',
  'confidence',
  'createdAt',
  'editedAt',
  'id',
  'note',
  'origin',
  'tagIds',
  'text',
];

const WRITTEN_FIELDS = [
  'anchor',
  'bookId',
  'createdAt',
  'editedAt',
  'id',
  'origin',
  'tagIds',
  'text',
];

const LIFTED_FIELDS = [
  'anchor',
  'bookId',
  'createdAt',
  'editedAt',
  'id',
  'note',
  'origin',
  'tagIds',
  'text',
];

const VARIANTS = [
  {
    name: 'a recognized capture with a note, tags and no confidence',
    row: RECOGNIZED_CAPTURE_ROW,
    fields: RECOGNIZED_FIELDS,
    shape: RECOGNIZED_SHAPE,
  },
  {
    name: 'a recognized capture across two images with a confidence',
    row: SCORED_CAPTURE_ROW,
    fields: RECOGNIZED_FIELDS,
    shape: SCORED_SHAPE,
  },
  {
    name: 'a written capture on a region',
    row: WRITTEN_CAPTURE_ROW,
    fields: WRITTEN_FIELDS,
    shape: WRITTEN_SHAPE,
  },
  {
    name: 'a lifted capture on a text anchor',
    row: LIFTED_CAPTURE_ROW,
    fields: LIFTED_FIELDS,
    shape: LIFTED_SHAPE,
  },
] as const;

const CAPTURE_FORMAT_CHANGED = formatChanged('a capture row');

beforeEach(() => {
  held.rows.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the 1.x capture row', () => {
  for (const { name, row } of VARIANTS) {
    it(`reads the frozen row of ${name} as exactly the same capture`, () => {
      expect(captureFromStored(row), CAPTURE_FORMAT_CHANGED).toStrictEqual(row);
    });
  }

  for (const { name, row, fields, shape } of VARIANTS) {
    it(`writes ${name} with exactly the 1.x fields and field types when it saves it`, async () => {
      await createCaptureRepository().save(captureFromStored(row));

      const written = held.rows.get(row.id);
      expect(written, CAPTURE_FORMAT_CHANGED).toStrictEqual(row);
      expect(sortedKeys(written ?? {}), CAPTURE_FORMAT_CHANGED).toStrictEqual(fields);
      expect(shapeOf(written), CAPTURE_FORMAT_CHANGED).toStrictEqual(shape);
    });
  }

  for (const { name, row, shape } of VARIANTS) {
    it(`writes ${name} with exactly the 1.x fields and field types when it moves it to another book`, async () => {
      const another = '1d4c3b2a-0f9e-4d8c-b7a6-958473625140';
      held.rows.set(row.id, row);

      await createCaptureRepository().moveBook(bookId(row.bookId), bookId(another));

      const written = held.rows.get(row.id);
      expect(written, CAPTURE_FORMAT_CHANGED).toStrictEqual({ ...row, bookId: another });
      expect(shapeOf(written), CAPTURE_FORMAT_CHANGED).toStrictEqual(shape);
    });
  }

  it('opens the recognition database at the 1.x version with the 1.x stores and indexes', async () => {
    await createCaptureRepository().listEverything();

    const [opened] = held.opened;
    expect(opened && layoutOf(opened), schemaChanged('recognition')).toStrictEqual(
      RECOGNITION_DATABASE,
    );
  });
});
