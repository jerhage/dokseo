import { describe, expect, it } from 'vitest';
import {
  IOS_CANVAS_AREA,
  IOS_CANVAS_AREA_BEFORE_18,
  decodedBytes,
  decodedFigure,
  durationText,
  iosCanvasFit,
  sizeFigure,
} from './bitmap-memory';

describe('decodedBytes', () => {
  it('counts four bytes for every pixel', () => {
    expect(decodedBytes({ width: 2000, height: 3000 })).toBe(24_000_000);
  });

  it('reports nothing for a closed bitmap of zero size', () => {
    expect(decodedBytes({ width: 0, height: 0 })).toBe(0);
  });

  it('reports nothing for a size that is not a number', () => {
    expect(decodedBytes({ width: Number.NaN, height: 10 })).toBe(0);
  });
});

describe('decodedFigure', () => {
  it('writes the memory of a 2000 by 3000 page as 24 MB', () => {
    expect(decodedFigure({ width: 2000, height: 3000 })).toBe('24.0 MB');
  });
});

describe('iosCanvasFit', () => {
  it('names the two WebKit area caps by their pixel counts', () => {
    expect(IOS_CANVAS_AREA).toBe(67_108_864);
    expect(IOS_CANVAS_AREA_BEFORE_18).toBe(16_777_216);
  });

  it.each([
    [{ width: 2000, height: 3000 }, 'fits-both'],
    [{ width: 4096, height: 4096 }, 'fits-both'],
    [{ width: 1000, height: 20_000 }, 'fits-current-only'],
    [{ width: 8192, height: 8192 }, 'fits-current-only'],
    [{ width: 8192, height: 8193 }, 'fits-neither'],
  ] as const)('places %o under %s', (size, kind) => {
    expect(iosCanvasFit(size).kind).toBe(kind);
  });
});

describe('durationText', () => {
  it('rounds a long duration to whole milliseconds', () => {
    expect(durationText(123.6)).toBe('124 ms');
  });

  it('keeps one decimal under ten milliseconds', () => {
    expect(durationText(3.14)).toBe('3.1 ms');
  });

  it('reports a negative duration as not measured', () => {
    expect(durationText(-1)).toBe('not measured');
  });
});

describe('sizeFigure', () => {
  it('writes width by height', () => {
    expect(sizeFigure({ width: 720, height: 960 })).toBe('720 × 960');
  });
});
