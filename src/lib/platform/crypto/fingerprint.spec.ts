import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FINGERPRINT_SAMPLE_BYTES,
  FINGERPRINT_WHOLE_UP_TO,
  NO_DIGEST_OUTSIDE_A_SECURE_CONTEXT,
  fingerprintOf,
} from './fingerprint';

function run(length: number, fill: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  bytes.fill(fill);
  return bytes;
}

const HEAD = run(FINGERPRINT_SAMPLE_BYTES, 0x61);

const TAIL = run(FINGERPRINT_SAMPLE_BYTES, 0x7a);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fingerprintOf', () => {
  it('rejects with a named reason when the page offers no crypto.subtle', async () => {
    vi.stubGlobal('crypto', {});

    await expect(fingerprintOf(new Blob(['page bytes']))).rejects.toThrow(
      NO_DIGEST_OUTSIDE_A_SECURE_CONTEXT,
    );
  });

  it.each([
    { label: 'a small blob', blob: new Blob(['page bytes']) },
    { label: 'an empty blob', blob: new Blob([]) },
  ])('hashes $label to sixty-four hex characters', async ({ blob }) => {
    const digest = await fingerprintOf(blob);

    expect(digest).toMatch(/^[0-9a-f]{64}$/u);
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

  it('separates two large blobs whose ends match but whose sizes differ', async () => {
    const one = new Blob([HEAD, run(1, 0x30), TAIL]);
    const other = new Blob([HEAD, run(2, 0x30), TAIL]);

    expect(await fingerprintOf(one)).not.toBe(await fingerprintOf(other));
  });

  it.each([
    { part: 'first', other: [run(FINGERPRINT_SAMPLE_BYTES, 0x62), run(8, 0x30), TAIL] },
    { part: 'last', other: [HEAD, run(8, 0x30), run(FINGERPRINT_SAMPLE_BYTES, 0x79)] },
  ])('separates two large blobs that differ in the $part mebibyte', async ({ other }) => {
    const one = new Blob([HEAD, run(8, 0x30), TAIL]);

    expect(await fingerprintOf(one)).not.toBe(await fingerprintOf(new Blob(other)));
  });
});
