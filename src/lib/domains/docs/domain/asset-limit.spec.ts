import { describe, expect, it } from 'vitest';
import { CLOUDFLARE_ASSET_LIMIT_BYTES, fitsOneAsset, mebibytes, totalBytes } from './asset-limit';

describe('fitsOneAsset', () => {
  it('accepts a file of exactly 25 MiB', () => {
    expect(fitsOneAsset({ name: 'edge', bytes: 26_214_400 })).toBe(true);
  });

  it('rejects a file one byte over 25 MiB', () => {
    expect(fitsOneAsset({ name: 'over', bytes: CLOUDFLARE_ASSET_LIMIT_BYTES + 1 })).toBe(false);
  });
});

describe('totalBytes', () => {
  it('adds the sizes of every file', () => {
    expect(
      totalBytes([
        { name: 'a', bytes: 3 },
        { name: 'b', bytes: 4 },
      ]),
    ).toBe(7);
  });
});

describe('mebibytes', () => {
  it('writes a size in MiB with one decimal', () => {
    expect(mebibytes(32_674_733)).toBe('31.2');
  });
});
