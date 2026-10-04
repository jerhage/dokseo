import { describe, expect, it } from 'vitest';
import {
  RECORD_FORMATS,
  fieldRows,
  fitsDeclared,
  fixturePaths,
  leavesOf,
  ownFieldRows,
  recordFormat,
  typeOf,
} from './field-notes';

describe('the stored format field notes', () => {
  it.each(RECORD_FORMATS.map((format) => [format.title, format] as const))(
    'lists exactly the fields the %s fixtures hold',
    (_title, format) => {
      expect(format.notes.map((note) => note.path).toSorted()).toEqual(
        fixturePaths(format).toSorted(),
      );
    },
  );

  it.each(RECORD_FORMATS.map((format) => [format.title, format] as const))(
    'declares a type for every %s fixture value that the value has',
    (_title, format) => {
      const misfits = format.variants.flatMap((variant) =>
        leavesOf(variant.row).flatMap((leaf) => {
          const note = format.notes.find((candidate) => candidate.path === leaf.path);
          return note === undefined || fitsDeclared(note, leaf.value)
            ? []
            : [`${variant.name} ${leaf.path}: ${typeOf(leaf.value)} is not ${note.type}`];
        }),
      );

      expect(misfits).toEqual([]);
    },
  );

  it('walks into nested objects and lists of objects, and stops at a list of text', () => {
    expect(
      leavesOf({ a: { b: 1 }, list: [{ c: null }, { c: 'x' }], names: ['p', 'q'], none: [] }),
    ).toEqual([
      { path: 'a.b', value: 1 },
      { path: 'list[].c', value: null },
      { path: 'list[].c', value: 'x' },
      { path: 'names', value: ['p', 'q'] },
      { path: 'none', value: [] },
    ]);
  });

  it('accepts an empty list for any list type and rejects a type the note leaves out', () => {
    const note = { path: 'tagIds', type: 'string[]', meaning: '', rule: '' };

    expect(fitsDeclared(note, [])).toBe(true);
    expect(fitsDeclared(note, ['a'])).toBe(true);
    expect(fitsDeclared(note, null)).toBe(false);
    expect(fitsDeclared({ ...note, type: 'number | null' }, 'x')).toBe(false);
  });

  it('takes each example from the first fixture that holds the field', () => {
    const rows = fieldRows(recordFormat('book'));

    expect(rows.find((row) => row.path === 'position.offset')?.example).toBe('0');
    expect(rows.find((row) => row.path === 'position.cfi')?.example).toBe(
      '"epubcfi(/6/14!/4/2/38/1:112)"',
    );
  });

  it('shortens a long example with an ellipsis', () => {
    const names = fieldRows(recordFormat('page-list')).find((row) => row.path === 'names');

    expect(names?.example).toHaveLength(36);
    expect(names?.example.endsWith('…')).toBe(true);
  });

  it('leaves only removedAt once the book fields are taken out of the removed record', () => {
    const rows = ownFieldRows(recordFormat('removed-book'), recordFormat('book'));

    expect(rows.map((row) => [row.path, row.example])).toEqual([['removedAt', '1790000000000']]);
  });
});
