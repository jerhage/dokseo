import { describe, expect, it } from 'vitest';
import { FINGERPRINT_SAMPLE_BYTES, FINGERPRINT_WHOLE_UP_TO, fingerprintOf } from './fingerprint';

function run(length: number, fill: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  bytes.fill(fill);
  return bytes;
}

const HEAD = run(FINGERPRINT_SAMPLE_BYTES, 0x61);

const TAIL = run(FINGERPRINT_SAMPLE_BYTES, 0x7a);

describe('fingerprintOf', () => {
  it('hashes a small blob to sixty-four hex characters', async () => {
    const digest = await fingerprintOf(new Blob(['page bytes']));

    expect(digest).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('hashes an empty blob', async () => {
    const digest = await fingerprintOf(new Blob([]));

    expect(digest).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('gives two blobs holding the same bytes the same fingerprint', async () => {
    const one = await fingerprintOf(new Blob(['Yotsuba&! 1']));
    const other = await fingerprintOf(new Blob(['Yotsuba&! 1']));

    expect(one).toBe(other);
  });

  it('separates two small blobs that differ in the middle', async () => {
    const one = await fingerprintOf(new Blob(['abXde']));
    const other = await fingerprintOf(new Blob(['abYde']));

    expect(one).not.toBe(other);
  });

  it('reads every byte of a blob of exactly two mebibytes', async () => {
    const middle = FINGERPRINT_SAMPLE_BYTES;
    const one = run(FINGERPRINT_WHOLE_UP_TO, 0x61);
    const other = run(FINGERPRINT_WHOLE_UP_TO, 0x61);
    other[middle] = 0x62;

    expect(await fingerprintOf(new Blob([one]))).not.toBe(await fingerprintOf(new Blob([other])));
  });

  it('skips the middle of a blob one byte past two mebibytes', async () => {
    const one = new Blob([HEAD, run(1, 0x30), TAIL]);
    const other = new Blob([HEAD, run(1, 0x31), TAIL]);

    expect(one.size).toBe(FINGERPRINT_WHOLE_UP_TO + 1);
    expect(await fingerprintOf(one)).toBe(await fingerprintOf(other));
  });

  it('gives two large blobs differing only in the middle the same fingerprint', async () => {
    const one = new Blob([HEAD, run(FINGERPRINT_SAMPLE_BYTES, 0x30), TAIL]);
    const other = new Blob([HEAD, run(FINGERPRINT_SAMPLE_BYTES, 0x31), TAIL]);

    expect(await fingerprintOf(one)).toBe(await fingerprintOf(other));
  });

  it('separates two large blobs whose ends match but whose sizes differ', async () => {
    const one = new Blob([HEAD, run(1, 0x30), TAIL]);
    const other = new Blob([HEAD, run(2, 0x30), TAIL]);

    expect(await fingerprintOf(one)).not.toBe(await fingerprintOf(other));
  });

  it('separates two large blobs that differ in the first mebibyte', async () => {
    const one = new Blob([HEAD, run(8, 0x30), TAIL]);
    const other = new Blob([run(FINGERPRINT_SAMPLE_BYTES, 0x62), run(8, 0x30), TAIL]);

    expect(await fingerprintOf(one)).not.toBe(await fingerprintOf(other));
  });

  it('separates two large blobs that differ in the last mebibyte', async () => {
    const one = new Blob([HEAD, run(8, 0x30), TAIL]);
    const other = new Blob([HEAD, run(8, 0x30), run(FINGERPRINT_SAMPLE_BYTES, 0x79)]);

    expect(await fingerprintOf(one)).not.toBe(await fingerprintOf(other));
  });
});
