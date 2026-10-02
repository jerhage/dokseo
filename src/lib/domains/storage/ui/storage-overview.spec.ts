import { describe, expect, it } from 'vitest';
import { accountOf } from '../domain/storage-parts';
import type { StorageAccount, StoragePart } from '../domain/storage-parts';
import {
  UNNAMED_KEY,
  allowanceOf,
  breakdownRows,
  breakdownScale,
  usedHeadline,
} from './storage-overview';

const MODEL: StoragePart = {
  key: 'model',
  label: 'manga-ocr base',
  detail: '7 files',
  bytes: 205_000_000,
};

const BOOKS: StoragePart = {
  key: 'books',
  label: 'Books and their covers',
  detail: '12 files',
  bytes: 480_000_000,
};

const RUNTIME: StoragePart = {
  key: 'runtime',
  label: 'The ONNX runtime',
  detail: '1 file',
  bytes: 27_000_000,
};

const RECORDS: StoragePart = {
  key: 'records',
  label: 'Book records',
  detail: 'no size is reported',
  bytes: null,
};

function account(parts: readonly StoragePart[], usage: number | null): StorageAccount {
  return accountOf(parts, usage === null ? null : { usage, quota: 11_133_000_000 }, true);
}

function keys(shown: StorageAccount): readonly string[] {
  return breakdownRows(shown).map((row) => row.key);
}

describe('breakdownRows', () => {
  it.each([
    {
      parts: [RUNTIME, MODEL, BOOKS],
      rows: [
        ['books', '480 MB'],
        ['model', '205 MB'],
        ['runtime', '27 MB'],
      ],
    },
    {
      parts: [RECORDS, RUNTIME, MODEL],
      rows: [
        ['model', '205 MB'],
        ['runtime', '27 MB'],
        ['records', 'not measurable'],
      ],
    },
    {
      parts: [RECORDS, { ...RUNTIME, bytes: 0 }],
      rows: [
        ['runtime', '0 kB'],
        ['records', 'not measurable'],
      ],
    },
  ])(
    'orders the measured parts largest first and a part that cannot be measured last',
    ({ parts, rows }) => {
      const shown = breakdownRows(account(parts, null)).map((row) => [row.key, row.figure]);

      expect(shown).toEqual(rows);
    },
  );

  it('adds the bytes no part explains as the last row when the browser reports a total', () => {
    const rows = breakdownRows(account([MODEL, RECORDS], 395_000_000));
    const last = rows.at(-1);

    expect(last?.key).toBe(UNNAMED_KEY);
    expect(last?.bytes).toBe(190_000_000);
    expect(last?.figure).toBe('190 MB');
  });

  it('adds no unnamed row when the browser gives no total', () => {
    expect(keys(account([MODEL], null))).toEqual(['model']);
  });

  it('draws no share for an overshoot, whose figure is negative', () => {
    const rows = breakdownRows(account([MODEL], 200_000_000));
    const unnamed = rows.find((row) => row.key === UNNAMED_KEY);

    expect(unnamed?.bytes).toBeNull();
    expect(unnamed?.figure).toBe('−5 MB');
  });
});

describe('breakdownScale', () => {
  it.each([
    { parts: [MODEL], usage: 395_000_000, scale: 395_000_000 },
    { parts: [MODEL], usage: 200_000_000, scale: 205_000_000 },
    { parts: [MODEL, RUNTIME], usage: null, scale: 232_000_000 },
  ])(
    'scales the shares to the larger of the browser total $usage and the measured total',
    ({ parts, usage, scale }) => {
      expect(breakdownScale(account(parts, usage))).toBe(scale);
    },
  );
});

describe('usedHeadline', () => {
  it('leads with the browser total when there is one', () => {
    expect(usedHeadline(account([MODEL], 395_000_000))).toEqual({
      figure: '395 MB',
      caption: 'counted by the browser for this app',
    });
  });

  it('falls back to the measured total and says the browser gave none', () => {
    const headline = usedHeadline(account([MODEL, RECORDS], null));

    expect(headline.figure).toBe('205 MB');
    expect(headline.caption).toContain('reports no total');
  });
});

describe('allowanceOf', () => {
  it('pairs the browser total with the quota', () => {
    expect(allowanceOf(account([MODEL], 395_000_000))).toEqual({
      used: 395_000_000,
      allowed: 11_133_000_000,
    });
  });

  it('reports no allowance when the browser gives no estimate', () => {
    expect(allowanceOf(account([MODEL], null))).toBeNull();
  });
});
