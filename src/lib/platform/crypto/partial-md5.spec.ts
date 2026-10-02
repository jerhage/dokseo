import { describe, expect, it } from 'vitest';
import {
  PARTIAL_MD5_SAMPLE_BYTES,
  luajitLeftShift,
  partialMd5,
  partialMd5Offsets,
} from './partial-md5';

function seededBytes(length: number): Uint8Array<ArrayBuffer> {
  return Uint8Array.from({ length }, (_, index) => (index * 31 + 7) % 251);
}

const KOREADER_REFERENCE: readonly (readonly [number, string])[] = [
  [0, 'd41d8cd98f00b204e9800998ecf8427e'],
  [1, '89e74e640b8c46257a29de0616794d5d'],
  [1023, '184b34b08bbb6b06f914e59a579c2a7b'],
  [1024, '5121b74d11d0ad611a246b4137993844'],
  [1025, '35b02546e34868e7b75dab8c43d47c36'],
  [5000, 'e9b23960f33568cd50442e8f305853c3'],
  [70_000, '724b94d04f9ceeab34ab28718b86062d'],
  [300_000, '3d87fe2dd28ddc7895ae5e290bfa539e'],
  [1_048_576, '3d87fe2dd28ddc7895ae5e290bfa539e'],
  [1_048_577, '786211a95054ac0cec32c0535d32846b'],
  [1_500_000, '951d6ad62a386c5d5e49f4c898e5c6c2'],
];

class SlicedBlob extends Blob {
  readonly ranges: (readonly [number, number])[] = [];

  override slice(start?: number, end?: number, contentType?: string): Blob {
    this.ranges.push([start ?? 0, end ?? this.size]);
    return super.slice(start, end, contentType);
  }
}

describe('luajitLeftShift', () => {
  it('masks a negative shift count to five bits and overflows to zero, as bit.lshift does', () => {
    expect(luajitLeftShift(1024, -2)).toBe(0);
  });
});

describe('partialMd5Offsets', () => {
  it('lists the twelve offsets KOReader seeks to, starting at zero', () => {
    expect(partialMd5Offsets()).toEqual([
      0, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864, 268435456,
      1073741824,
    ]);
  });
});

describe('partialMd5', () => {
  it.each(KOREADER_REFERENCE)(
    'digests %i seeded bytes as the KOReader loop does',
    async (length, expected) => {
      expect(await partialMd5(new Blob([seededBytes(length)]))).toBe(expected);
    },
  );

  it('reads only the samples that start inside the blob, each at most 1024 bytes', async () => {
    const blob = new SlicedBlob([seededBytes(300_000)]);

    await partialMd5(blob);

    expect(blob.ranges).toEqual(
      [0, 1024, 4096, 16384, 65536, 262144].map((offset) => [
        offset,
        offset + PARTIAL_MD5_SAMPLE_BYTES,
      ]),
    );
  });

  it('stops at an offset that is exactly the end of the blob', async () => {
    const blob = new SlicedBlob([seededBytes(1024)]);

    await partialMd5(blob);

    expect(blob.ranges).toEqual([[0, 1024]]);
  });
});
