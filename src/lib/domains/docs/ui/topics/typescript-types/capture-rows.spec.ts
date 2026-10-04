import { describe, expect, it } from 'vitest';
import { DAMAGE_OPTIONS, checkedCaptureRow, isRowDamage, rowText } from './capture-rows';
import type { RowDamage } from './capture-rows';

function checked(damage: RowDamage) {
  return checkedCaptureRow(rowText(damage));
}

describe('checkedCaptureRow', () => {
  it('reads the undamaged row as a recognized capture with no defaults', () => {
    const result = checked('none');

    expect(result.kind).toBe('read');
    if (result.kind !== 'read') return;
    expect(result.capture.origin).toBe('recognized');
    expect(result.defaults).toEqual([]);
  });

  it('fills a missing origin and a missing note with their defaults', () => {
    expect(checked('origin-missing')).toMatchObject({
      kind: 'read',
      defaults: ["origin: missing → 'recognized'"],
    });
    expect(checked('note-missing')).toMatchObject({
      kind: 'read',
      defaults: ['note: missing → null'],
    });
  });

  it('drops the confidence of a written capture, which its type has no field for', () => {
    const result = checked('written-confidence');

    expect(result).toMatchObject({
      kind: 'read',
      defaults: ['confidence: 0.94 dropped, a written capture has none'],
    });
    if (result.kind !== 'read') return;
    expect('confidence' in result.capture).toBe(false);
  });

  it('sets a row aside and names the field when a field has no safe default', () => {
    expect(checked('region-x-text')).toEqual({
      kind: 'set-aside',
      id: 'c-41',
      reason: 'A stored capture holds an unknown region x: 120',
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
