import { describe, expect, it } from 'vitest';
import {
  fieldsWith,
  flagCellText,
  flagRows,
  flagTally,
  flagVerdict,
  flatLoadType,
} from './flag-states';
import type { FlagCell, LoadField } from './flag-states';

function cells(set: Partial<Record<LoadField, boolean>>, fields: readonly LoadField[]): FlagCell[] {
  return fields.map((field) => ({ field, set: set[field] ?? false }));
}

const ALL_FIELDS = fieldsWith(['titles', 'message']);

describe('flagRows', () => {
  it('lists every combination of three flags once', () => {
    const rows = flagRows([]);

    expect(rows).toHaveLength(8);
    expect(new Set(rows.map((row) => row.cells.map((cell) => cell.set).join())).size).toBe(8);
  });

  it('doubles the combinations for each optional field', () => {
    expect(flagRows(['titles'])).toHaveLength(16);
    expect(flagRows(['titles', 'message'])).toHaveLength(32);
  });

  it('starts with every field false and ends with every field true', () => {
    const rows = flagRows(['titles', 'message']);

    expect(rows[0]?.cells.every((cell) => !cell.set)).toBe(true);
    expect(rows.at(-1)?.cells.every((cell) => cell.set)).toBe(true);
  });
});

describe('flagTally', () => {
  it('counts three meaningful combinations whatever the number of fields', () => {
    expect(flagTally(flagRows([]))).toEqual({ combinations: 8, meaningful: 3 });
    expect(flagTally(flagRows(['titles']))).toEqual({ combinations: 16, meaningful: 3 });
    expect(flagTally(flagRows(['titles', 'message']))).toEqual({
      combinations: 32,
      meaningful: 3,
    });
  });
});

describe('flagVerdict', () => {
  it('names the variant when exactly one flag holds and its detail is present', () => {
    expect(flagVerdict(cells({ ready: true, titles: true }, ALL_FIELDS))).toEqual({
      kind: 'variant',
      variant: 'ready',
    });
    expect(flagVerdict(cells({ failed: true, message: true }, ALL_FIELDS))).toEqual({
      kind: 'variant',
      variant: 'failed',
    });
    expect(flagVerdict(cells({ loading: true }, ALL_FIELDS))).toEqual({
      kind: 'variant',
      variant: 'loading',
    });
  });

  it('reports no flag at all', () => {
    expect(flagVerdict(cells({}, fieldsWith([])))).toEqual({
      kind: 'meaningless',
      reasons: ['no flag is true'],
    });
  });

  it('reports two flags as both true and three as all true', () => {
    expect(flagVerdict(cells({ loading: true, failed: true }, fieldsWith([])))).toEqual({
      kind: 'meaningless',
      reasons: ['loading and failed are both true'],
    });
    expect(
      flagVerdict(cells({ loading: true, failed: true, ready: true }, fieldsWith([]))),
    ).toEqual({ kind: 'meaningless', reasons: ['loading, failed and ready are all true'] });
  });

  it('reports a detail without its flag and a flag without its detail', () => {
    expect(flagVerdict(cells({ loading: true, titles: true }, ALL_FIELDS))).toEqual({
      kind: 'meaningless',
      reasons: ['titles without ready'],
    });
    expect(flagVerdict(cells({ failed: true }, ALL_FIELDS))).toEqual({
      kind: 'meaningless',
      reasons: ['failed without message'],
    });
  });

  it('ignores the detail rule for a field the type does not have', () => {
    expect(flagVerdict(cells({ ready: true }, fieldsWith(['message'])))).toEqual({
      kind: 'variant',
      variant: 'ready',
    });
  });
});

describe('flatLoadType', () => {
  it('declares the three flags and only the optional fields asked for', () => {
    expect(flatLoadType(['message'])).toBe(
      [
        'type Load = {',
        '  readonly loading: boolean;',
        '  readonly failed: boolean;',
        '  readonly ready: boolean;',
        '  readonly message?: string;',
        '};',
      ].join('\n'),
    );
  });
});

describe('flagCellText', () => {
  it('writes a flag as true or false and an optional field as set or absent', () => {
    expect(flagCellText({ field: 'ready', set: true })).toBe('true');
    expect(flagCellText({ field: 'failed', set: false })).toBe('false');
    expect(flagCellText({ field: 'titles', set: true })).toBe('set');
    expect(flagCellText({ field: 'message', set: false })).toBe('absent');
  });
});
