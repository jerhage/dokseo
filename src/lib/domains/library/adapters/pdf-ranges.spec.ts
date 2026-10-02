import { describe, expect, it } from 'vitest';
import { RANGE_CHUNK_BYTES, clampRange, initialChunkSize } from './pdf-ranges';

describe('initialChunkSize', () => {
  it('reads the whole of a file smaller than one chunk', () => {
    expect(initialChunkSize(1024)).toBe(1024);
  });

  it.each([RANGE_CHUNK_BYTES, RANGE_CHUNK_BYTES + 1, 400 * 1024 * 1024])(
    'reads one range chunk from a file of %i bytes, at or past a chunk',
    (size) => {
      expect(initialChunkSize(size)).toBe(RANGE_CHUNK_BYTES);
    },
  );

  it('reads nothing from an empty or nonsensical size', () => {
    expect(initialChunkSize(0)).toBe(0);
    expect(initialChunkSize(-1)).toBe(0);
    expect(initialChunkSize(Number.NaN)).toBe(0);
  });
});

describe('clampRange', () => {
  it('passes a range that lies inside the file through unchanged', () => {
    expect(clampRange(65_536, 131_072, 400_000)).toEqual({ begin: 65_536, end: 131_072 });
  });

  it('trims an end that runs past the last byte', () => {
    expect(clampRange(65_536, 131_072, 100_000)).toEqual({ begin: 65_536, end: 100_000 });
  });

  it.each([
    [100_000, 131_072, 100_000],
    [200_000, 300_000, 100_000],
    [0, 65_536, 0],
  ])(
    'reports an empty range for a begin of %i at or past the last byte, an empty file included',
    (begin, end, size) => {
      expect(clampRange(begin, end, size)).toEqual({ begin: size, end: size });
    },
  );

  it('reports an empty range when the end precedes the begin', () => {
    expect(clampRange(80_000, 10_000, 400_000)).toEqual({ begin: 80_000, end: 80_000 });
  });

  it('lifts a negative begin to the first byte', () => {
    expect(clampRange(-10, 1024, 400_000)).toEqual({ begin: 0, end: 1024 });
  });

  it('rounds a fractional offset down to a whole byte', () => {
    expect(clampRange(10.7, 2048.9, 400_000)).toEqual({ begin: 10, end: 2048 });
  });
});
