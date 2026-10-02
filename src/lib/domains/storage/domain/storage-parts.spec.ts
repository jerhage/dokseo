import { describe, expect, it } from 'vitest';
import { accountOf, tallyDetail, tallyOf } from './storage-parts';
import type { StoragePart } from './storage-parts';

function part(key: string, bytes: number | null): StoragePart {
  return { key, label: key, detail: '1 file', bytes };
}

const MODEL = part('model', 205_000_000);

const RUNTIME = part('runtime', 27_000_000);

const RECORDS = part('records', null);

describe('accountOf', () => {
  it('sums the measured parts into one measured total', () => {
    const account = accountOf([MODEL, RUNTIME], { usage: 232_000_000, quota: 1 }, true);

    expect(account.measured).toBe(232_000_000);
  });

  it.each([
    { parts: [MODEL, RUNTIME], usage: 232_000_000, remainder: 0 },
    { parts: [MODEL], usage: 395_000_000, remainder: 190_000_000 },
    { parts: [MODEL, RUNTIME, RECORDS], usage: 395_000_000, remainder: 163_000_000 },
    { parts: [MODEL, RUNTIME], usage: 200_000_000, remainder: -32_000_000 },
  ])(
    'reports the difference between the parts and an origin total of $usage as $remainder',
    ({ parts, usage, remainder }) => {
      const account = accountOf(parts, { usage, quota: 1 }, true);

      expect(account.remainder).toBe(remainder);
    },
  );

  it('leaves an unmeasurable part out of the measured total rather than counting it as zero', () => {
    const account = accountOf([MODEL, RECORDS], { usage: 395_000_000, quota: 1 }, true);

    expect(account.measured).toBe(205_000_000);
    expect(account.remainder).toBe(190_000_000);
  });

  it('keeps an unmeasurable part in the breakdown and names it', () => {
    const account = accountOf([MODEL, RECORDS], { usage: 395_000_000, quota: 1 }, true);

    expect(account.parts).toHaveLength(2);
    expect(account.unmeasured.map((one) => one.key)).toEqual(['records']);
  });

  it('reports no remainder when the browser gives no origin total', () => {
    const account = accountOf([MODEL], null, false);

    expect(account.usage).toBeNull();
    expect(account.remainder).toBeNull();
  });
});

describe('tallyOf', () => {
  it('counts a file of unreported size without adding bytes for it', () => {
    const tally = tallyOf([{ bytes: 1_000 }, { bytes: null }]);

    expect(tally).toEqual({ files: 2, bytes: 1_000, unsized: 1 });
  });
});

describe('tallyDetail', () => {
  it('says how many files reported no size', () => {
    expect(tallyDetail({ files: 7, bytes: 1, unsized: 2 })).toBe('7 files, 2 of unreported size');
  });

  it('says only the count when every file reported its size', () => {
    expect(tallyDetail({ files: 1, bytes: 1, unsized: 0 })).toBe('1 file');
  });
});
