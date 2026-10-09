import { describe, expect, it } from 'vitest';
import { captureId, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { chosenRow, highlightedRow, movedCursor, rowsFor } from './tag-picker-rules';
import type { PickerRow, PickerTags } from './tag-picker-rules';

const CARD = captureId('capture-one');

const SFX: Tag = namedTag(tagId('sfx'), 'sfx', 'slate', 1);

const KEIGO: Tag = namedTag(tagId('keigo'), 'keigo', 'clay', 2);

const SAGE: Tag = namedTag(tagId('sage'), 'sage', 'sage', 3);

const LIBRARY: readonly Tag[] = [SFX, KEIGO, SAGE];

const COUNTS: ReadonlyMap<TagId, number> = new Map([
  [SFX.id, 3],
  [SAGE.id, 2],
  [KEIGO.id, 1],
]);

const HELD: PickerTags = { tags: LIBRARY, counts: COUNTS };

function labels(rows: readonly PickerRow[]): readonly string[] {
  return rows.map((row) => (row.kind === 'tag' ? row.tag.name : `create ${row.name}`));
}

function opened(carried: readonly TagId[] = [], typed = ''): readonly PickerRow[] {
  return rowsFor(HELD, CARD, carried, typed);
}

describe('rowsFor', () => {
  it.each([
    [
      'every tag, with its count, and no create row when nothing is typed',
      [],
      '',
      ['sfx', 'sage', 'keigo'],
      [3, 2, 1],
    ],
    [
      'the matching tags and then a create row when the name is free',
      [],
      'sa',
      ['sage', 'create sa'],
      [2, -1],
    ],
    ['the matching tags alone when a tag already has that name', [], 'sage', ['sage'], [2]],
    ['a create row alone when no tag matches', [], 'grammar', ['create grammar'], [-1]],
    ['no row when the capture already carries the name typed', [SFX.id], 'sfx', [], []],
  ])('offers %s', (_case, carried, typed, offered, counts) => {
    const rows = opened(carried, typed);

    expect(labels(rows)).toEqual(offered);
    expect(rows.map((row) => (row.kind === 'tag' ? row.count : -1))).toEqual(counts);
  });

  it('holds no row while no capture is open', () => {
    expect(rowsFor(HELD, null, [], '')).toEqual([]);
  });
});

describe('highlightedRow', () => {
  it('clamps the highlight to the last row when the rows shrink under it', () => {
    expect(highlightedRow(2, 3)).toBe(2);
    expect(highlightedRow(2, 1)).toBe(0);
  });
});

describe('movedCursor', () => {
  it.each([
    ['the last row rather than wrapping to the first', 0, 99, 2],
    ['the first row rather than wrapping to the last', 1, -5, 0],
  ])('stops at %s', (_case, from, step, landed) => {
    expect(movedCursor(from, step, 3)).toBe(landed);
  });

  it('moves from the highlighted row, not from a cursor past the rows', () => {
    expect(movedCursor(5, 1, 2)).toBe(1);
  });
});

describe('chosenRow', () => {
  it('reports the highlighted row as the chosen one', () => {
    expect(chosenRow(1, opened())).toEqual({ kind: 'tag', tag: SAGE, count: 2 });
  });

  it('chooses the create row when it is the only one offered', () => {
    expect(chosenRow(0, opened([], 'grammar'))).toEqual({ kind: 'create', name: 'grammar' });
  });

  it('chooses nothing when no row is offered', () => {
    expect(chosenRow(0, opened([SFX.id], 'sfx'))).toBeNull();
  });
});
