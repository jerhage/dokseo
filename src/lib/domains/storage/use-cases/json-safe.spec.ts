import { describe, expect, it } from 'vitest';
import { jsonSafe } from './json-safe';

describe('jsonSafe', () => {
  it('keeps text, finite numbers, booleans, null, lists and nested fields as they are', () => {
    const row = { id: 'c-1', text: 'あ', at: 1.5, on: true, note: null, tags: ['a', 'b'] };

    expect(jsonSafe(row)).toEqual(row);
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['an invalid date', new Date(Number.NaN)],
  ])('turns %s into null', (_, value) => {
    expect(jsonSafe({ value })).toEqual({ value: null });
  });

  it('leaves out a field holding undefined, a function or a symbol, and writes null for one in a list', () => {
    const row = { gone: undefined, run: () => 1, mark: Symbol('mark'), list: [undefined, 1] };

    expect(jsonSafe(row)).toEqual({ list: [null, 1] });
  });

  it('writes a date as its ISO text and a big integer as its decimal text', () => {
    const row = { at: new Date(Date.UTC(2026, 9, 4)), size: 12345678901234567890n };

    expect(jsonSafe(row)).toEqual({ at: '2026-10-04T00:00:00.000Z', size: '12345678901234567890' });
  });

  it('writes a map as key and value pairs, a set as a list, and binary data as its bytes', () => {
    const row = {
      map: new Map<unknown, unknown>([['a', 1]]),
      set: new Set([2, Number.NaN]),
      view: new Uint8Array([7, 8]).subarray(1),
      buffer: new Uint8Array([7, 8]).buffer,
    };

    expect(jsonSafe(row)).toEqual({ map: [['a', 1]], set: [2, null], view: [8], buffer: [7, 8] });
  });

  it('writes null where a row refers back to itself, and keeps a value it merely repeats', () => {
    const shared = { x: 1 };
    const row: Record<string, unknown> = { left: shared, right: shared };
    row.self = row;

    expect(jsonSafe(row)).toEqual({ left: { x: 1 }, right: { x: 1 }, self: null });
  });

  it('gives a value that JSON.stringify writes and JSON.parse reads back unchanged', () => {
    const safe = jsonSafe({ a: Number.NaN, b: [new Date(0)], c: { d: 10n } });

    expect(JSON.parse(JSON.stringify(safe))).toEqual(safe);
  });
});
