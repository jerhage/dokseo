import { describe, expect, it } from 'vitest';
import { FIRST, PLAN, SECOND } from './captures-import-fixtures';
import { conflictsOf, resolutionOf } from './captures-import-rules';

describe('resolutionOf', () => {
  it('builds each whole-file strategy and the reviewed choices', () => {
    const choices = new Map([[FIRST.id, { kind: 'file' } as const]]);

    expect(resolutionOf('newer', choices)).toEqual({ kind: 'newer' });
    expect(resolutionOf('this-device', choices)).toEqual({ kind: 'this-device' });
    expect(resolutionOf('review', choices)).toEqual({ kind: 'review', choices });
  });
});

describe('conflictsOf', () => {
  it('lists only the conflicts, in plan order', () => {
    expect(conflictsOf(PLAN)).toEqual([FIRST, SECOND]);
  });
});
