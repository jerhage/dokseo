import { describe, expect, it } from 'vitest';
import { DAMAGE_OPTIONS, STORED_ROW, checkedRow, damagedRow, isRowDamage } from './row-check';
import type { RowDamage } from './row-check';

function checked(damage: RowDamage) {
  return checkedRow(damagedRow(STORED_ROW, damage));
}

describe('checkedRow', () => {
  it('reads the stored row unchanged', () => {
    const result = checked('none');

    expect(result).toEqual({ kind: 'read', book: STORED_ROW });
  });

  it.each([
    { damage: 'language-unknown', reason: 'A stored book holds an unknown language: fr' },
    { damage: 'direction-missing', reason: 'A stored book lacks its direction' },
    { damage: 'layout-unknown', reason: 'A stored book holds an unknown layout kind: scroll' },
    { damage: 'title-missing', reason: 'A stored book lacks its title' },
    { damage: 'position-unknown', reason: 'A stored book holds an unknown position kind: page' },
  ] as const)('sets the row aside for $damage, keeping its id', ({ damage, reason }) => {
    const result = checked(damage);

    expect(result).toMatchObject({
      kind: 'set-aside',
      reason,
      unreadable: { id: STORED_ROW.id, fileName: STORED_ROW.fileName },
    });
  });

  it('fails the whole listing for a row whose id is not a safe key', () => {
    expect(checked('id-unsafe')).toEqual({
      kind: 'listing-fails',
      reason: 'A stored book holds an unknown id: ../books',
    });
  });
});

describe('isRowDamage', () => {
  it('accepts every offered damage and rejects anything else', () => {
    expect(DAMAGE_OPTIONS.every((option) => isRowDamage(option.damage))).toBe(true);
    expect(isRowDamage('flood')).toBe(false);
  });
});
