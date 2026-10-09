import { describe, expect, it } from 'vitest';
import { captureId, tagId } from '$lib/shared/ids';
import { createTagPicker } from './tag-picker.svelte';

const CARD = captureId('capture-one');

const SFX = tagId('sfx');

describe('createTagPicker', () => {
  it('names no capture while it is closed, and names the capture once opened', () => {
    const picker = createTagPicker();

    expect(picker.capture).toBeNull();
    picker.open(CARD, [SFX]);
    expect([picker.capture, picker.carried]).toEqual([CARD, [SFX]]);
  });

  it('clears the query and the highlight when it opens again', () => {
    const picker = createTagPicker();
    picker.open(CARD, []);
    picker.setQuery('sage');
    picker.moveBy(1, 3);
    picker.open(CARD, []);

    expect([picker.query, picker.cursor]).toEqual(['', 0]);
  });

  it('forgets the capture and the query when it closes', () => {
    const picker = createTagPicker();
    picker.open(CARD, [SFX]);
    picker.setQuery('sage');
    picker.close();

    expect([picker.capture, picker.carried, picker.query]).toEqual([null, [], '']);
  });

  it('starts again at the first row when the reader types', () => {
    const picker = createTagPicker();
    picker.open(CARD, []);
    picker.moveBy(2, 3);
    picker.setQuery('s');

    expect(picker.cursor).toBe(0);
  });

  it('moves the highlight by the step and stops at either end', () => {
    const picker = createTagPicker();
    picker.open(CARD, []);

    picker.moveBy(99, 3);
    expect(picker.cursor).toBe(2);
    picker.moveBy(-5, 3);
    expect(picker.cursor).toBe(0);
  });
});
