import { describe, expect, it } from 'vitest';
import { chunkRanges } from './blob-chunks';

describe('chunkRanges', () => {
  it.each([
    {
      size: 25,
      chunk: 10,
      ranges: [
        { from: 0, to: 10 },
        { from: 10, to: 20 },
        { from: 20, to: 25 },
      ],
    },
    {
      size: 20,
      chunk: 10,
      ranges: [
        { from: 0, to: 10 },
        { from: 10, to: 20 },
      ],
    },
    { size: 3, chunk: 10, ranges: [{ from: 0, to: 3 }] },
    { size: 0, chunk: 10, ranges: [] },
  ])(
    'covers a blob of $size bytes in chunks of $chunk with no gap and no overlap',
    ({ size, chunk, ranges }) => {
      expect(chunkRanges(size, chunk)).toEqual(ranges);
    },
  );

  it('advances by at least one byte when asked for an impossible chunk', () => {
    expect(chunkRanges(3, 0)).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ]);
  });
});
