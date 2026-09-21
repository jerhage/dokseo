import { describe, expect, it } from 'vitest';
import { WRITE_CHUNK_BYTES, chunkRanges } from './blob-chunks';

describe('chunkRanges', () => {
  it('covers the whole blob with no gap and no overlap', () => {
    const ranges = chunkRanges(25, 10);

    expect(ranges).toEqual([
      { from: 0, to: 10 },
      { from: 10, to: 20 },
      { from: 20, to: 25 },
    ]);
  });

  it('ends the last range at the size when the size divides exactly', () => {
    const ranges = chunkRanges(20, 10);

    expect(ranges.at(-1)).toEqual({ from: 10, to: 20 });
  });

  it('reports one range for a blob smaller than a chunk', () => {
    expect(chunkRanges(3, 10)).toEqual([{ from: 0, to: 3 }]);
  });

  it('reports nothing for an empty blob', () => {
    expect(chunkRanges(0, 10)).toEqual([]);
  });

  it('writes no range wider than the chunk size', () => {
    const wide = chunkRanges(WRITE_CHUNK_BYTES * 2 + 7, WRITE_CHUNK_BYTES).filter(
      (range) => range.to - range.from > WRITE_CHUNK_BYTES,
    );

    expect(wide).toEqual([]);
  });

  it('advances by at least one byte when asked for an impossible chunk', () => {
    expect(chunkRanges(3, 0)).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ]);
  });
});
