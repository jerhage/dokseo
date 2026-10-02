import { describe, expect, it } from 'vitest';
import { captureId, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { TagPicker } from './tag-picker.svelte';
import type { PickerRow } from './tag-picker.svelte';

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

function labels(rows: readonly PickerRow[]): readonly string[] {
  return rows.map((row) => (row.kind === 'tag' ? row.tag.name : `create ${row.name}`));
}

function world() {
  const held = { tags: LIBRARY, counts: COUNTS };
  const picker = new TagPicker(() => held);

  return { picker, held };
}

function opened(carried: readonly TagId[] = [], typed = ''): TagPicker {
  const { picker } = world();
  picker.open(CARD, carried);
  picker.query = typed;

  return picker;
}

describe('TagPicker', () => {
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
    const rows = opened(carried, typed).rows;

    expect(labels(rows)).toEqual(offered);
    expect(rows.map((row) => (row.kind === 'tag' ? row.count : -1))).toEqual(counts);
  });

  it('holds no row and no capture while it is closed, and names the capture once opened', () => {
    const { picker } = world();

    expect(picker.rows).toEqual([]);
    expect(picker.capture).toBeNull();
    expect(opened().capture).toBe(CARD);
  });

  it('clears the query and the highlight when it opens again', () => {
    const picker = opened([], 'sage');
    picker.moveBy(1);
    picker.open(CARD, []);

    expect(picker.query).toBe('');
    expect(picker.highlighted).toBe(0);
  });

  it('forgets the capture and the query when it closes', () => {
    const picker = opened([], 'sage');
    picker.close();

    expect(picker.capture).toBeNull();
    expect(picker.query).toBe('');
  });

  it.each([
    ['the last row rather than wrapping to the first', [99], 2],
    ['the first row rather than wrapping to the last', [1, -5], 0],
  ])('stops at %s', (_case, moves, highlighted) => {
    const picker = opened();
    for (const by of moves) picker.moveBy(by);

    expect(picker.highlighted).toBe(highlighted);
  });

  it('clamps the highlight to the last row when the rows shrink under it', () => {
    const { picker, held } = world();
    picker.open(CARD, []);
    picker.moveBy(2);
    expect(picker.highlighted).toBe(2);

    held.tags = [SFX];

    expect(picker.rows).toHaveLength(1);
    expect(picker.highlighted).toBe(0);
  });

  it('starts again at the first row when the reader types', () => {
    const picker = opened();
    picker.moveBy(2);
    picker.query = 's';

    expect(picker.highlighted).toBe(0);
  });

  it('reports the highlighted row as the chosen one', () => {
    const picker = opened();
    picker.moveBy(1);

    expect(picker.chosen).toEqual({ kind: 'tag', tag: SAGE, count: 2 });
  });

  it('chooses the create row when it is the only one offered', () => {
    expect(opened([], 'grammar').chosen).toEqual({ kind: 'create', name: 'grammar' });
  });

  it('chooses nothing when no row is offered', () => {
    expect(opened([SFX.id], 'sfx').chosen).toBeNull();
  });
});
