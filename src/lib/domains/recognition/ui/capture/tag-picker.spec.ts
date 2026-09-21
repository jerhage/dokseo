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
  it('offers every tag and no create row when nothing is typed', () => {
    expect(labels(opened().rows)).toEqual(['sfx', 'sage', 'keigo']);
  });

  it('offers the matching tags and then a create row when the name is free', () => {
    expect(labels(opened([], 'sa').rows)).toEqual(['sage', 'create sa']);
  });

  it('offers the matching tags alone when a tag already has that name', () => {
    expect(labels(opened([], 'sage').rows)).toEqual(['sage']);
  });

  it('offers a create row alone when no tag matches', () => {
    expect(labels(opened([], 'grammar').rows)).toEqual(['create grammar']);
  });

  it('offers no row when the capture already carries the name typed', () => {
    expect(opened([SFX.id], 'sfx').rows).toEqual([]);
  });

  it('carries the count of each tag it offers', () => {
    const rows = opened().rows;

    expect(rows.map((row) => (row.kind === 'tag' ? row.count : -1))).toEqual([3, 2, 1]);
  });

  it('holds no row and no capture while it is closed', () => {
    const { picker } = world();

    expect(picker.rows).toEqual([]);
    expect(picker.capture).toBeNull();
  });

  it('names the capture it was opened on', () => {
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

  it('stops at the last row rather than wrapping to the first', () => {
    const picker = opened();
    picker.moveBy(99);

    expect(picker.highlighted).toBe(2);
  });

  it('stops at the first row rather than wrapping to the last', () => {
    const picker = opened();
    picker.moveBy(1);
    picker.moveBy(-5);

    expect(picker.highlighted).toBe(0);
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
