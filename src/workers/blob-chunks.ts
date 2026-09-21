const WRITE_CHUNK_BYTES = 4 * 1024 * 1024;

type ByteRange = {
  readonly from: number;
  readonly to: number;
};

function chunkRanges(total: number, chunkBytes: number): readonly ByteRange[] {
  const step = Math.max(1, Math.floor(chunkBytes));
  const ranges: ByteRange[] = [];

  for (let from = 0; from < total; from += step) {
    ranges.push({ from, to: Math.min(from + step, total) });
  }

  return ranges;
}

export { WRITE_CHUNK_BYTES, chunkRanges };
export type { ByteRange };
