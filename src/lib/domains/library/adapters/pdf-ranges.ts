const RANGE_CHUNK_BYTES = 65_536;

interface ByteRange {
  readonly begin: number;
  readonly end: number;
}

function wholeBytes(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function initialChunkSize(size: number): number {
  return Math.min(wholeBytes(size), RANGE_CHUNK_BYTES);
}

function clampRange(begin: number, end: number, size: number): ByteRange {
  const limit = wholeBytes(size);
  const first = Math.min(wholeBytes(begin), limit);
  const last = Math.min(Math.max(wholeBytes(end), first), limit);
  return { begin: first, end: last };
}

export { RANGE_CHUNK_BYTES, initialChunkSize, clampRange };
export type { ByteRange };
