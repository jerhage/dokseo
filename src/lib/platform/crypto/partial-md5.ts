import { Md5 } from './md5';

const PARTIAL_MD5_STEP = 1024;

const PARTIAL_MD5_SAMPLE_BYTES = 1024;

const FIRST_EXPONENT = -1;

const LAST_EXPONENT = 10;

function luajitLeftShift(value: number, count: number): number {
  return value << count;
}

function partialMd5Offsets(): readonly number[] {
  return Array.from({ length: LAST_EXPONENT - FIRST_EXPONENT + 1 }, (_, position) =>
    luajitLeftShift(PARTIAL_MD5_STEP, 2 * (FIRST_EXPONENT + position)),
  );
}

const PARTIAL_MD5_OFFSETS = partialMd5Offsets();

async function partialMd5(blob: Blob): Promise<string> {
  const md5 = new Md5();
  for (const offset of PARTIAL_MD5_OFFSETS) {
    if (offset >= blob.size) break;
    const sample = await blob.slice(offset, offset + PARTIAL_MD5_SAMPLE_BYTES).arrayBuffer();
    md5.update(new Uint8Array(sample));
  }
  return md5.hexDigest();
}

export { PARTIAL_MD5_SAMPLE_BYTES, luajitLeftShift, partialMd5, partialMd5Offsets };
