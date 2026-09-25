import { describe, expect, it } from 'vitest';
import { accountOf } from '../../../domain/storage-parts';
import type { StorageAccount, StoragePart } from '../../../domain/storage-parts';
import {
  UNNAMED_KEY,
  allowanceOf,
  breakdownRows,
  breakdownScale,
  screenState,
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

describe('screenState', () => {
  it('reports reading while there is neither an account nor a message', () => {
    expect(screenState(null, null)).toEqual({ kind: 'reading' });
  });

  it('reports the failure message when there is no account', () => {
    expect(screenState(null, 'denied')).toEqual({ kind: 'failed', message: 'denied' });
  });

  it('shows the account once there is one', () => {
    const read = account([MODEL], null);

    expect(screenState(read, null)).toEqual({ kind: 'ready', account: read });
  });
});

describe('breakdownRows', () => {
  it('orders the measured parts largest first', () => {
    expect(keys(account([RUNTIME, MODEL, BOOKS], null))).toEqual(['books', 'model', 'runtime']);
  });

  it('puts a part that cannot be measured after every measured part', () => {
    expect(keys(account([RECORDS, RUNTIME, MODEL], null))).toEqual(['model', 'runtime', 'records']);
  });

  it('keeps an empty measured part ahead of one that cannot be measured', () => {
    const empty: StoragePart = { ...RUNTIME, bytes: 0 };

    expect(keys(account([RECORDS, empty], null))).toEqual(['runtime', 'records']);
  });

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

  it('prints not measurable for a part without a size', () => {
    const rows = breakdownRows(account([RECORDS], null));

    expect(rows[0]?.figure).toBe('not measurable');
  });
});

describe('breakdownScale', () => {
  it('scales the shares to the browser total when it is the larger', () => {
    expect(breakdownScale(account([MODEL], 395_000_000))).toBe(395_000_000);
  });

  it('scales the shares to the measured total when the parts overshoot', () => {
    expect(breakdownScale(account([MODEL], 200_000_000))).toBe(205_000_000);
  });

  it('scales the shares to the measured total when the browser gives none', () => {
    expect(breakdownScale(account([MODEL, RUNTIME], null))).toBe(232_000_000);
  });
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
