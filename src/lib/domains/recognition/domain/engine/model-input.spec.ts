import { describe, expect, it } from 'vitest';
import { downscaleFor, MAX_MODEL_INPUT_EDGE } from './model-input';

describe('downscaleFor', () => {
  it('leaves a small crop alone', () => {
    expect(downscaleFor({ width: 180, height: 420 })).toBe(1);
    expect(downscaleFor({ width: 1, height: 1 })).toBe(1);
  });

  it('leaves a crop exactly on the limit alone', () => {
    expect(downscaleFor({ width: MAX_MODEL_INPUT_EDGE, height: 700 })).toBe(1);
  });

  it('never returns a factor above one', () => {
    const sizes = [
      { width: 2, height: 3 },
      { width: 640, height: 900 },
      { width: MAX_MODEL_INPUT_EDGE - 1, height: MAX_MODEL_INPUT_EDGE - 1 },
      { width: MAX_MODEL_INPUT_EDGE * 4, height: 10 },
    ];

    for (const size of sizes) expect(downscaleFor(size)).toBeLessThanOrEqual(1);
  });

  it('reduces a wide crop to the limit', () => {
    const factor = downscaleFor({ width: 6000, height: 900 });

    expect(factor).toBeCloseTo(MAX_MODEL_INPUT_EDGE / 6000);
    expect(6000 * factor).toBeCloseTo(MAX_MODEL_INPUT_EDGE);
    expect(900 * factor).toBeLessThan(MAX_MODEL_INPUT_EDGE);
  });

  it('reduces a tall crop to the limit', () => {
    const factor = downscaleFor({ width: 900, height: 6000 });

    expect(factor).toBeCloseTo(MAX_MODEL_INPUT_EDGE / 6000);
    expect(6000 * factor).toBeCloseTo(MAX_MODEL_INPUT_EDGE);
  });

  it('reduces by the longer edge when both are past the limit', () => {
    const factor = downscaleFor({ width: 3000, height: 5000 });

    expect(factor).toBeCloseTo(MAX_MODEL_INPUT_EDGE / 5000);
    expect(3000 * factor).toBeLessThan(MAX_MODEL_INPUT_EDGE);
  });

  it('leaves a degenerate size alone', () => {
    expect(downscaleFor({ width: 0, height: 0 })).toBe(1);
    expect(downscaleFor({ width: -40, height: -10 })).toBe(1);
    expect(downscaleFor({ width: Number.NaN, height: 300 })).toBe(1);
    expect(downscaleFor({ width: Number.POSITIVE_INFINITY, height: 300 })).toBe(1);
  });
});
