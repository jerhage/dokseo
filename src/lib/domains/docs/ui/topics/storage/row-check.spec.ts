import { describe, expect, it } from 'vitest';
import { DAMAGE_OPTIONS, STORED_ROW, checkedRow, damagedRow, isRowDamage } from './row-check';
import type { RowDamage } from './row-check';

function checked(damage: RowDamage) {
  return checkedRow(damagedRow(STORED_ROW, damage));
}

describe('checkedRow', () => {
  it('reads the stored row unchanged, with no field filled in', () => {
    const result = checked('none');

    expect(result.kind).toBe('read');
    expect(result.kind === 'read' ? result.fallbacks : null).toEqual([]);
  });

  it.each([
    { damage: 'language-unknown', fallback: 'language: fr → ja' },
    { damage: 'direction-missing', fallback: 'direction: missing → rtl' },
  ] as const)('fills $damage with its default and says so', ({ damage, fallback }) => {
    const result = checked(damage);

    expect(result.kind === 'read' ? result.fallbacks : null).toEqual([fallback]);
  });

  it.each([
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
