import { describe, expect, it } from 'vitest';
import type { Size } from '$lib/shared/geometry';
import { clampZoom, fitZoom, MAX_ZOOM, MIN_ZOOM, panBy, zoomAt, type Viewport } from './viewport';

const identity: Viewport = { zoom: 1, panX: 0, panY: 0 };

function contentUnder(
  viewport: Viewport,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom,
  };
}

describe('clampZoom', () => {
  it('raises a zoom below the minimum to the minimum', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(MIN_ZOOM / 2)).toBe(MIN_ZOOM);
  });

  it('lowers a zoom above the maximum to the maximum', () => {
    expect(clampZoom(1000)).toBe(MAX_ZOOM);
    expect(clampZoom(MAX_ZOOM * 2)).toBe(MAX_ZOOM);
  });

  it('keeps a zoom already inside the range', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
    expect(clampZoom(MIN_ZOOM)).toBe(MIN_ZOOM);
    expect(clampZoom(MAX_ZOOM)).toBe(MAX_ZOOM);
  });

  it('falls back to the minimum for a non-finite zoom', () => {
    expect(clampZoom(Number.NaN)).toBe(MIN_ZOOM);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(MIN_ZOOM);
    expect(clampZoom(Number.NEGATIVE_INFINITY)).toBe(MIN_ZOOM);
  });

  it('falls back to the minimum for a zero or negative zoom', () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(-3)).toBe(MIN_ZOOM);
  });
});

describe('panBy', () => {
  it('shifts the pan by the delta and leaves the zoom alone', () => {
    const moved = panBy({ zoom: 2.5, panX: 10, panY: -20 }, 30, 45);

    expect(moved).toEqual({ zoom: 2.5, panX: 40, panY: 25 });
  });

  it('returns a new object rather than mutating its argument', () => {
    const before: Viewport = { zoom: 1, panX: 5, panY: 5 };
    const after = panBy(before, 1, 1);

    expect(after).not.toBe(before);
    expect(before).toEqual({ zoom: 1, panX: 5, panY: 5 });
  });
});

describe('zoomAt', () => {
  it('keeps the anchored point fixed while zooming in', () => {
    const before: Viewport = { zoom: 1, panX: 40, panY: -15 };
    const anchored = contentUnder(before, 300, 200);

    const after = zoomAt(before, 2, 300, 200);

    expect(after.zoom).toBeCloseTo(2);
    expect(contentUnder(after, 300, 200).x).toBeCloseTo(anchored.x);
    expect(contentUnder(after, 300, 200).y).toBeCloseTo(anchored.y);
  });

  it('keeps the anchored point fixed while zooming out', () => {
    const before: Viewport = { zoom: 4, panX: -120, panY: 80 };
    const anchored = contentUnder(before, 512, 384);

    const after = zoomAt(before, 0.25, 512, 384);

    expect(after.zoom).toBeCloseTo(1);
    expect(contentUnder(after, 512, 384).x).toBeCloseTo(anchored.x);
    expect(contentUnder(after, 512, 384).y).toBeCloseTo(anchored.y);
  });

  it('restores the original pan after zooming in and out by the reciprocal', () => {
    const before: Viewport = { zoom: 1.5, panX: 33, panY: -77 };

    const round = zoomAt(zoomAt(before, 2, 210, 130), 0.5, 210, 130);

    expect(round.zoom).toBeCloseTo(before.zoom);
    expect(round.panX).toBeCloseTo(before.panX);
    expect(round.panY).toBeCloseTo(before.panY);
  });

  it('keeps the pan consistent with the zoom actually applied when the clamp bites above', () => {
    const before: Viewport = { zoom: 4, panX: 100, panY: 50 };
    const anchored = contentUnder(before, 400, 300);

    const after = zoomAt(before, 100, 400, 300);

    expect(after.zoom).toBe(MAX_ZOOM);
    expect(contentUnder(after, 400, 300).x).toBeCloseTo(anchored.x);
    expect(contentUnder(after, 400, 300).y).toBeCloseTo(anchored.y);
    expect(after.panX).toBeCloseTo(400 - (400 - 100) * (MAX_ZOOM / 4));
  });

  it('keeps the pan consistent with the zoom actually applied when the clamp bites below', () => {
    const before: Viewport = { zoom: 0.2, panX: 100, panY: 50 };
    const anchored = contentUnder(before, 400, 300);

    const after = zoomAt(before, 0.001, 400, 300);

    expect(after.zoom).toBe(MIN_ZOOM);
    expect(contentUnder(after, 400, 300).x).toBeCloseTo(anchored.x);
    expect(contentUnder(after, 400, 300).y).toBeCloseTo(anchored.y);
    expect(after.panY).toBeCloseTo(300 - (300 - 50) * (MIN_ZOOM / 0.2));
  });

  it('falls back to the minimum zoom for a non-finite factor', () => {
    expect(zoomAt(identity, Number.NaN, 10, 10).zoom).toBe(MIN_ZOOM);
  });
});

describe('fitZoom', () => {
  const frame: Size = { width: 1000, height: 600 };
  const taller: Size = { width: 800, height: 1200 };
  const wider: Size = { width: 2000, height: 500 };

  it('fits content taller than the frame by height', () => {
    expect(fitZoom(taller, frame, 'height')).toBeCloseTo(0.5);
  });

  it('fits content taller than the frame by width', () => {
    expect(fitZoom(taller, frame, 'width')).toBeCloseTo(1.25);
  });

  it('fits content taller than the frame by contain, taking the smaller ratio', () => {
    expect(fitZoom(taller, frame, 'contain')).toBeCloseTo(0.5);
  });

  it('fits content wider than the frame by height', () => {
    expect(fitZoom(wider, frame, 'height')).toBeCloseTo(1.2);
  });

  it('fits content wider than the frame by width', () => {
    expect(fitZoom(wider, frame, 'width')).toBeCloseTo(0.5);
  });

  it('fits content wider than the frame by contain, taking the smaller ratio', () => {
    expect(fitZoom(wider, frame, 'contain')).toBeCloseTo(0.5);
  });

  it('returns the minimum zoom for a zero dimension', () => {
    expect(fitZoom({ width: 800, height: 0 }, frame, 'height')).toBe(MIN_ZOOM);
    expect(fitZoom({ width: 0, height: 1200 }, frame, 'width')).toBe(MIN_ZOOM);
    expect(fitZoom(taller, { width: 1000, height: 0 }, 'contain')).toBe(MIN_ZOOM);
    expect(fitZoom(taller, { width: 0, height: 600 }, 'contain')).toBe(MIN_ZOOM);
  });

  it('returns the minimum zoom for a non-finite dimension', () => {
    expect(fitZoom({ width: 800, height: Number.NaN }, frame, 'height')).toBe(MIN_ZOOM);
    expect(fitZoom({ width: Number.POSITIVE_INFINITY, height: 1200 }, frame, 'width')).toBe(
      MIN_ZOOM,
    );
    expect(fitZoom(taller, { width: 1000, height: Number.NaN }, 'contain')).toBe(MIN_ZOOM);
  });

  it('returns the minimum zoom for a negative dimension', () => {
    expect(fitZoom({ width: 800, height: -1200 }, frame, 'height')).toBe(MIN_ZOOM);
    expect(fitZoom(taller, { width: -1000, height: 600 }, 'width')).toBe(MIN_ZOOM);
  });

  it('clamps a fit that would exceed the zoom range', () => {
    expect(fitZoom({ width: 10, height: 10 }, { width: 10000, height: 10000 }, 'contain')).toBe(
      MAX_ZOOM,
    );
    expect(fitZoom({ width: 10000, height: 10000 }, { width: 10, height: 10 }, 'contain')).toBe(
      MIN_ZOOM,
    );
  });
});
