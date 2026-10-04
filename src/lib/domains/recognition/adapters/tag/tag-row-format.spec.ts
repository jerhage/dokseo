import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { layoutOf, RECOGNITION_DATABASE } from '$lib/shared/testing/stored-format/database-layout';
import type { OpenedDatabase, Upgrade } from '$lib/shared/testing/stored-format/database-layout';
import {
  GRAMMAR_TAG_ROW,
  VOCABULARY_TAG_ROW,
} from '$lib/shared/testing/stored-format/recognition-rows';
import {
  formatChanged,
  schemaChanged,
  shapeOf,
  sortedKeys,
} from '$lib/shared/testing/stored-format/stored-shape';
import { tagFromStored } from '../../domain/tag/tag';
import { TAG_COLOURS, isTagColour } from '../../domain/tag/tag-colour';
import { createTagRepository } from './indexeddb-tags.repo';

type HeldRow = { readonly id: unknown };

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
}));

const TAG_SHAPE = { colour: 'string', createdAt: 'number', id: 'string', name: 'string' };

const VARIANTS = [
  { name: 'a tag with a plain name', row: VOCABULARY_TAG_ROW },
  { name: 'a tag with a name in two scripts', row: GRAMMAR_TAG_ROW },
] as const;

const TAG_FORMAT_CHANGED = formatChanged('a tag row');

beforeEach(() => {
  held.rows.clear();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the 1.x tag row', () => {
  for (const { name, row } of VARIANTS) {
    it(`reads the frozen row of ${name} as exactly the same tag`, () => {
      expect(tagFromStored(row), TAG_FORMAT_CHANGED).toStrictEqual(row);
    });
  }

  for (const { name, row } of VARIANTS) {
    it(`writes ${name} with exactly the 1.x fields and field types when it saves it`, async () => {
      await createTagRepository().save(tagFromStored(row));

      const written = held.rows.get(row.id);
      expect(written, TAG_FORMAT_CHANGED).toStrictEqual(row);
      expect(sortedKeys(written ?? {}), TAG_FORMAT_CHANGED).toStrictEqual([
        'colour',
        'createdAt',
        'id',
        'name',
      ]);
      expect(shapeOf(written), TAG_FORMAT_CHANGED).toStrictEqual(TAG_SHAPE);
    });
  }

  it('holds exactly the 16 tag colours of 1.x', () => {
    const colours = [
      'clay',
      'copper',
      'cyan',
      'fern',
      'ice',
      'indigo',
      'magenta',
      'olive',
      'plum',
      'rose',
      'ruby',
      'sage',
      'sky',
      'slate',
      'stone',
      'violet',
    ];

    expect(TAG_COLOURS.toSorted(), TAG_FORMAT_CHANGED).toStrictEqual(colours);
    expect(colours.filter(isTagColour), TAG_FORMAT_CHANGED).toStrictEqual(colours);
  });

  it('opens the recognition database at the 1.x version with the 1.x stores and indexes', async () => {
    await createTagRepository().list();

    const [opened] = held.opened;
    expect(opened && layoutOf(opened), schemaChanged('recognition')).toStrictEqual(
      RECOGNITION_DATABASE,
    );
  });
});
