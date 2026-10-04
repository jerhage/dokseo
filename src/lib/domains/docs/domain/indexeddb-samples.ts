type SampleBook = { readonly id: string; readonly title: string; readonly hash: string };

type SampleCapture = {
  readonly bookId: string;
  readonly page: number;
  readonly createdAt: number;
  readonly tagIds?: readonly string[];
};

type QueryPresetKey =
  | 'store-all'
  | 'store-range'
  | 'index-key'
  | 'compound-range'
  | 'multi-entry'
  | 'cursor-prev'
  | 'distinct'
  | 'count';

type QueryPreset = {
  readonly key: QueryPresetKey;
  readonly label: string;
  readonly code: string;
  readonly order: string;
};

const SAMPLE_BOOKS: readonly SampleBook[] = [
  { id: 'b1', title: 'Harbor Lights', hash: 'a1f3' },
  { id: 'b2', title: 'Paper Moon', hash: 'c07e' },
  { id: 'b3', title: 'Night Train', hash: '9d21' },
];

const SAMPLE_CAPTURES: readonly SampleCapture[] = [
  { bookId: 'b2', page: 12, createdAt: 1005, tagIds: ['question'] },
  { bookId: 'b1', page: 3, createdAt: 1001, tagIds: ['vocab'] },
  { bookId: 'b2', page: 4, createdAt: 1002, tagIds: ['vocab', 'grammar'] },
  { bookId: 'b3', page: 30, createdAt: 1009 },
  { bookId: 'b1', page: 9, createdAt: 1007, tagIds: ['grammar'] },
  { bookId: 'b2', page: 15, createdAt: 1004, tagIds: [] },
  { bookId: 'b1', page: 5, createdAt: 1003, tagIds: ['vocab'] },
  { bookId: 'b3', page: 41, createdAt: 1006, tagIds: ['question', 'vocab'] },
];

const DUPLICATE_ATTEMPT = {
  fresh: { id: 'b4', title: 'Salt Road', hash: 'e5aa' },
  clash: { id: 'b5', title: 'Second Copy', hash: 'a1f3' },
} as const satisfies Record<string, SampleBook>;

const QUERY_PRESETS: readonly QueryPreset[] = [
  {
    key: 'store-all',
    label: 'Every capture',
    code: `captures.getAll()`,
    order: 'Primary key order: the generated ids 1, 2, 3 in the order the rows were added.',
  },
  {
    key: 'store-range',
    label: 'A key range and a count',
    code: `captures.getAll(IDBKeyRange.bound(3, 7), 3)`,
    order: 'Keys 3 to 7 inclusive, stopped after three records.',
  },
  {
    key: 'index-key',
    label: 'One book, by index',
    code: `captures.index('bookId').getAll('b2')`,
    order: 'Index order: by bookId, then by primary key for equal bookIds.',
  },
  {
    key: 'compound-range',
    label: 'One book, by time',
    code: `captures.index('bookId-createdAt').getAll(IDBKeyRange.bound(['b2'], ['b2', []]))`,
    order:
      "Compound keys compare element by element, and any array sorts after a number, so the range holds every ['b2', time].",
  },
  {
    key: 'multi-entry',
    label: 'One tag, multiEntry',
    code: `captures.index('tagIds').getAll('vocab')`,
    order:
      'Each tag in a tagIds array is its own index entry, so a capture with two tags is found under both.',
  },
  {
    key: 'cursor-prev',
    label: 'Cursor, newest first',
    code: `captures.index('createdAt').openCursor(null, 'prev')`,
    order: 'A cursor walks one record per success event; prev starts at the highest key.',
  },
  {
    key: 'distinct',
    label: 'Distinct book ids',
    code: `captures.index('bookId').openKeyCursor(null, 'nextunique')`,
    order:
      'nextunique stops once per distinct index key: a SELECT DISTINCT with one step per value.',
  },
  {
    key: 'count',
    label: 'Count one book',
    code: `captures.index('bookId').count('b1')`,
    order: 'count() returns a number and reads no values.',
  },
];

function queryPreset(key: QueryPresetKey): QueryPreset {
  const preset = QUERY_PRESETS.find((candidate) => candidate.key === key);
  if (preset === undefined) throw new Error(`No query preset is named ${key}`);
  return preset;
}

export { DUPLICATE_ATTEMPT, QUERY_PRESETS, SAMPLE_BOOKS, SAMPLE_CAPTURES, queryPreset };
export type { QueryPreset, QueryPresetKey, SampleBook, SampleCapture };
