import { describe, expect, it } from 'vitest';
import {
  LIGHT_ON_DARK_LUMINANCE,
  MAX_CROP_EDGE,
  shouldInvert,
  UPSCALE,
  upscaleFor,
} from './preprocess';

describe('upscaleFor', () => {
  it('upscales a small crop by the full factor', () => {
    expect(upscaleFor({ width: 180, height: 420 })).toBe(UPSCALE);
    expect(UPSCALE).toBe(3);
  });

  it('reduces the factor so a wide crop stays within the limit', () => {
    const factor = upscaleFor({ width: 1200, height: 300 });
    expect(factor).toBeCloseTo(MAX_CROP_EDGE / 1200);
    expect(1200 * factor).toBeCloseTo(MAX_CROP_EDGE);
  });

  it('reduces the factor so a tall crop stays within the limit', () => {
    const factor = upscaleFor({ width: 300, height: 1200 });
    expect(factor).toBeCloseTo(MAX_CROP_EDGE / 1200);
    expect(1200 * factor).toBeCloseTo(MAX_CROP_EDGE);
  });

  it('reduces the factor by the longer edge when both would exceed the limit', () => {
    const factor = upscaleFor({ width: 900, height: 1500 });
    expect(factor).toBeCloseTo(MAX_CROP_EDGE / 1500);
    expect(900 * factor).toBeLessThan(MAX_CROP_EDGE);
  });

  it('leaves a crop already at the limit unscaled', () => {
    expect(upscaleFor({ width: MAX_CROP_EDGE, height: 700 })).toBe(1);
  });

  it('never returns less than one for a crop past the limit', () => {
    expect(upscaleFor({ width: MAX_CROP_EDGE * 4, height: MAX_CROP_EDGE * 6 })).toBe(1);
  });

  it('upscales fully for a degenerate size', () => {
    expect(upscaleFor({ width: 0, height: 0 })).toBe(UPSCALE);
    expect(upscaleFor({ width: -40, height: -10 })).toBe(UPSCALE);
    expect(upscaleFor({ width: Number.NaN, height: 300 })).toBe(UPSCALE);
  });
});

describe('shouldInvert', () => {
  it('inverts a crop dark enough to be light text on a dark ground', () => {
    expect(shouldInvert(LIGHT_ON_DARK_LUMINANCE - 0.01)).toBe(true);
    expect(shouldInvert(0.05)).toBe(true);
  });

  it('leaves a crop above the threshold alone', () => {
    expect(shouldInvert(LIGHT_ON_DARK_LUMINANCE + 0.01)).toBe(false);
    expect(shouldInvert(0.92)).toBe(false);
  });

  it('leaves a crop exactly on the threshold alone', () => {
    expect(shouldInvert(LIGHT_ON_DARK_LUMINANCE)).toBe(false);
  });

  it('leaves a crop alone when the luminance is not a number', () => {
    expect(shouldInvert(Number.NaN)).toBe(false);
  });
});
