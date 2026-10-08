import { readCapturesFile } from '$lib/domains/storage/use-cases/read-captures-file';
import { isStoredFields, isText } from '$lib/shared/corrupt-row';
import GOLDEN_FILE from '$lib/shared/testing/stored-format/captures-v1.golden.json';
import {
  CATALOG_ORIGINS_DATABASE,
  READER_DATABASE,
  RECOGNITION_DATABASE,
} from '$lib/shared/testing/stored-format/database-layout';
import type { DatabaseLayout } from '$lib/shared/testing/stored-format/database-layout';

type Coverage = 'rows' | 'store only' | 'outside';

type StoreRow = {
  readonly database: string;
  readonly version: number;
  readonly store: string;
  readonly keyPath: string;
  readonly indexes: readonly string[];
  readonly coverage: Coverage;
};

type GoldenCount = {
  readonly section: string;
  readonly inFile: number;
  readonly read: number;
};

const OUTSIDE_ROWS = new Set(['model-consent', 'recognizer-setup']);

const FLOWING_STORE: StoreRow = {
  database: 'flowing',
  version: 1,
  store: 'reading-settings',
  keyPath: 'reader',
  indexes: [],
  coverage: 'outside',
};

const GOLDEN_TEXT = JSON.stringify(GOLDEN_FILE, null, 2);

function keyPathOf(options: unknown): string {
  return isStoredFields(options) && isText(options.keyPath) ? options.keyPath : '';
}

function indexText(name: string, keyPath: unknown, options: unknown): string {
  const many = isStoredFields(options) && options.multiEntry === true;
  const unique = isStoredFields(options) && options.unique === true;
  const path = Array.isArray(keyPath)
    ? keyPath.filter(isText).join(' + ')
    : isText(keyPath)
      ? keyPath
      : '';
  return `${name} on ${path}${many ? ', multiEntry' : ''}${unique ? ', unique' : ''}`;
}

function storeRows(layout: DatabaseLayout): readonly StoreRow[] {
  return Object.entries(layout.stores).map(([store, held]) => ({
    database: layout.name,
    version: layout.version,
    store,
    keyPath: keyPathOf(held.options),
    indexes: Object.entries(held.indexes).map(([name, index]) =>
      indexText(name, index.keyPath, index.options),
    ),
    coverage: OUTSIDE_ROWS.has(store) ? 'store only' : 'rows',
  }));
}

const STORE_ROWS: readonly StoreRow[] = [
  ...storeRows(READER_DATABASE),
  ...storeRows(RECOGNITION_DATABASE),
  FLOWING_STORE,
  ...storeRows(CATALOG_ORIGINS_DATABASE),
];

function goldenCounts(text: string): readonly GoldenCount[] {
  const read = readCapturesFile(text);
  if (read.kind !== 'read') return [];
  const file: unknown = JSON.parse(text);
  const listed = (name: string): number => {
    if (!isStoredFields(file)) return 0;
    const section = file[name];
    return Array.isArray(section) ? section.length : 0;
  };
  return [
    { section: 'books', inFile: listed('books'), read: read.books.length },
    { section: 'tags', inFile: listed('tags'), read: read.tags.length },
    { section: 'captures', inFile: listed('captures'), read: read.captures.length },
    { section: 'unreadable', inFile: read.storedUnreadable, read: 0 },
  ];
}

function goldenPart(name: 'books' | 'captures' | 'unreadable'): string {
  const part = name === 'unreadable' ? GOLDEN_FILE.unreadable : GOLDEN_FILE[name][0];
  return JSON.stringify(part, null, 2);
}

export { GOLDEN_TEXT, STORE_ROWS, goldenCounts, goldenPart, storeRows };
export type { Coverage, GoldenCount, StoreRow };
