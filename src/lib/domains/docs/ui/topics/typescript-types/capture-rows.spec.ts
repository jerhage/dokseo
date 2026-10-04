import { describe, expect, it } from 'vitest';
import { DAMAGE_OPTIONS, checkedCaptureRow, isRowDamage, rowText } from './capture-rows';
import type { RowDamage } from './capture-rows';

function checked(damage: RowDamage) {
  return checkedCaptureRow(rowText(damage));
}

describe('checkedCaptureRow', () => {
  it('reads the undamaged row as a recognized capture', () => {
    const result = checked('none');

    expect(result.kind).toBe('read');
    if (result.kind !== 'read') return;
    expect(result.capture.origin).toBe('recognized');
  });

  it.each([
    { damage: 'origin-missing', reason: 'A stored capture lacks its origin' },
    { damage: 'note-missing', reason: 'A stored capture lacks its note' },
    {
      damage: 'written-confidence',
      reason: 'A stored capture holds an unknown note for a written capture: null',
    },
  ] as const)('sets the $damage row aside, with no default for the field', ({ damage, reason }) => {
    expect(checked(damage)).toEqual({ kind: 'set-aside', id: 'c-41', reason });
  });

  it('sets a row aside and names the field that fails its check', () => {
    expect(checked('region-x-text')).toEqual({
      kind: 'set-aside',
      id: 'c-41',
      reason: 'A stored capture holds an unknown region x: 0.12',
    });
    expect(checked('rect-outside')).toMatchObject({
      reason: 'A stored capture holds an unknown region rect outside the page: 0.12,0.05,0.95,0.2',
    });
    expect(checked('tag-number')).toMatchObject({
      reason: 'A stored capture holds an unknown tag ids: 7',
    });
    expect(checked('anchor-kind')).toMatchObject({
      reason: 'A stored capture holds an unknown anchor kind: page',
    });
    expect(checked('anchor-text')).toMatchObject({
      reason: 'A stored capture holds an unknown anchor: region',
    });
    expect(checked('text-missing')).toMatchObject({ reason: 'A stored capture lacks its text' });
  });

  it('fails the whole listing when the row has no id to set it aside under', () => {
    expect(checked('id-missing')).toEqual({
      kind: 'listing-fails',
      reason: 'A stored capture lacks its id',
    });
  });

  it('refuses text that is not JSON and JSON that is not an object', () => {
    expect(checkedCaptureRow('{ id:')).toMatchObject({ kind: 'not-a-row' });
    expect(checkedCaptureRow('42')).toEqual({
      kind: 'not-a-row',
      reason: 'A row must be an object, and this is 42',
    });
  });
});

describe('isRowDamage', () => {
  it('accepts every listed damage and rejects any other text', () => {
    expect(DAMAGE_OPTIONS.every((option) => isRowDamage(option.damage))).toBe(true);
    expect(isRowDamage('burned')).toBe(false);
  });
});
