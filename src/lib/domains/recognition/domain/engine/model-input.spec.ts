import { describe, expect, it } from 'vitest';
import { downscaleFor, MAX_MODEL_INPUT_EDGE } from './model-input';

describe('downscaleFor', () => {
  it('leaves a small crop alone', () => {
    expect(downscaleFor({ width: 180, height: 420 })).toBe(1);
    expect(downscaleFor({ width: 1, height: 1 })).toBe(1);
    expect(downscaleFor({ width: 2, height: 3 })).toBe(1);
    expect(downscaleFor({ width: 640, height: 900 })).toBe(1);
    expect(
      downscaleFor({ width: MAX_MODEL_INPUT_EDGE - 1, height: MAX_MODEL_INPUT_EDGE - 1 }),
    ).toBe(1);
  });

  it('leaves a crop exactly on the limit alone', () => {
    expect(downscaleFor({ width: MAX_MODEL_INPUT_EDGE, height: 700 })).toBe(1);
  });

  it.each([
    { crop: 'wide', long: 6000, short: 900, size: { width: 6000, height: 900 } },
    { crop: 'tall', long: 6000, short: 900, size: { width: 900, height: 6000 } },
    {
      crop: 'very wide',
      long: MAX_MODEL_INPUT_EDGE * 4,
      short: 10,
      size: { width: MAX_MODEL_INPUT_EDGE * 4, height: 10 },
    },
  ])('reduces a $crop crop to the limit', ({ long, short, size }) => {
    const factor = downscaleFor(size);

    expect(factor).toBeCloseTo(MAX_MODEL_INPUT_EDGE / long);
    expect(long * factor).toBeCloseTo(MAX_MODEL_INPUT_EDGE);
    expect(short * factor).toBeLessThan(MAX_MODEL_INPUT_EDGE);
  });

  it('reduces by the longer edge when both are past the limit', () => {
    const factor = downscaleFor({ width: 3000, height: 5000 });

    expect(factor).toBeCloseTo(MAX_MODEL_INPUT_EDGE / 5000);
    expect(3000 * factor).toBeLessThan(MAX_MODEL_INPUT_EDGE);
  });

  it('reduces to a limit it is given', () => {
    expect(downscaleFor({ width: 1000, height: 400 }, 500)).toBeCloseTo(0.5);
    expect(downscaleFor({ width: 400, height: 300 }, 500)).toBe(1);
  });

  it('leaves a degenerate size alone', () => {
    expect(downscaleFor({ width: 0, height: 0 })).toBe(1);
    expect(downscaleFor({ width: -40, height: -10 })).toBe(1);
    expect(downscaleFor({ width: Number.NaN, height: 300 })).toBe(1);
    expect(downscaleFor({ width: Number.POSITIVE_INFINITY, height: 300 })).toBe(1);
  });
});
