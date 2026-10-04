type FieldShape = string | readonly FieldShape[] | { readonly [field: string]: FieldShape };

function shapeOf(value: unknown): FieldShape {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.map(shapeOf);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => (left < right ? -1 : 1))
        .map(([field, held]) => [field, shapeOf(held)]),
    );
  }
  return typeof value;
}

function sortedKeys(value: object): readonly string[] {
  return Object.keys(value).toSorted();
}

function formatChanged(row: string): string {
  return [
    `The 1.x stored format of ${row} changed.`,
    'Change a stored shape only on purpose:',
    'after 1.0 that takes a new IndexedDB database version with an upgrade migration',
    'that rewrites every row already stored, and only then this fixture and this pin.',
  ].join(' ');
}

function schemaChanged(database: string): string {
  return [
    `The 1.x layout of the "${database}" IndexedDB database changed.`,
    'A new store, index or version is a format change:',
    'after 1.0 it ships with its upgrade migration, and only then this pin changes.',
  ].join(' ');
}

const CAPTURES_FILE_CHANGED = [
  'The captures file v1 this build writes changed.',
  'Within 1.x a v1 file may only gain an optional part that every 1.x reader ignores,',
  'and every v1 file written before must still import;',
  'anything else is a new file version, with the v1 reader kept.',
  'For an additive change keep captures-v1.golden.json exactly as it is, still importing,',
  'and check the new bytes against a second golden file.',
].join(' ');

const GOLDEN_FILE_MUST_IMPORT = [
  'captures-v1.golden.json must keep importing, with exactly this result,',
  'for all of 1.x. A change to the captures file v1 is additive or it is a new file version.',
].join(' ');

export {
  CAPTURES_FILE_CHANGED,
  GOLDEN_FILE_MUST_IMPORT,
  formatChanged,
  schemaChanged,
  shapeOf,
  sortedKeys,
};
export type { FieldShape };
