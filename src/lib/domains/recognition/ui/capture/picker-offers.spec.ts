import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import type { Tag } from '../../domain/tag/tag';
import type { PickerRow } from './tag-picker.svelte';
import { pickerOffers } from './picker-offers';

const VERB: Tag = { id: tagId('t1'), name: 'verb', colour: 'rose', createdAt: 1 };
const KANJI: Tag = { id: tagId('t2'), name: 'kanji', colour: 'sky', createdAt: 2 };

const ROWS: readonly PickerRow[] = [
  { kind: 'tag', tag: VERB, count: 3 },
  { kind: 'tag', tag: KANJI, count: 1 },
  { kind: 'create', name: 'ver' },
];

describe('pickerOffers', () => {
  it('lists the tags apart from the offer to create, each keeping its place in the rows', () => {
    const offers = pickerOffers(ROWS, 0, 'p');

    expect(offers.tags.map((offer) => [offer.id, offer.tag.name, offer.count])).toEqual([
      ['p-row-0', 'verb', 3],
      ['p-row-1', 'kanji', 1],
    ]);
    expect(offers.create?.id).toBe('p-row-2');
    expect(offers.create?.name).toBe('ver');
  });

  it('marks only the highlighted row, even when it is the offer to create', () => {
    const offers = pickerOffers(ROWS, 2, 'p');

    expect(offers.tags.map((offer) => offer.selected)).toEqual([false, false]);
    expect(offers.create?.selected).toBe(true);
    expect(offers.active).toBe('p-row-2');
  });

  it('offers nothing to create and names no active row when there are no rows', () => {
    expect(pickerOffers([], 0, 'p')).toEqual({ tags: [], create: null, active: undefined });
  });
});
