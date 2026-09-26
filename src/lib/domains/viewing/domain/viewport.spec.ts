import { describe, expect, it } from 'vitest';
import type { Size } from '$lib/shared/geometry';
import {
  canPan,
  centrePan,
  clampPan,
  clampZoom,
  DOUBLE_TAP_ZOOM,
  doubleTapTarget,
  fitZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  pinchStep,
  pinchZoom,
  zoomAt,
} from './viewport';
import type { Viewport } from './viewport';

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

describe('clampPan', () => {
  const frame: Size = { width: 1000, height: 600 };

  it('centres both axes when the scaled content is smaller than the frame', () => {
    const settled = clampPan({ zoom: 1, panX: 200, panY: -90 }, { width: 400, height: 200 }, frame);

    expect(settled).toEqual({ zoom: 1, panX: 300, panY: 200 });
  });

  it('keeps a pan already inside the range when the content overflows both axes', () => {
    const settled = clampPan(
      { zoom: 1, panX: -300, panY: -100 },
      { width: 2000, height: 900 },
      frame,
    );

    expect(settled).toEqual({ zoom: 1, panX: -300, panY: -100 });
  });

  it('clamps a pan past the near edge back to zero', () => {
    const settled = clampPan({ zoom: 1, panX: 250, panY: 80 }, { width: 2000, height: 900 }, frame);

    expect(settled).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });

  it('clamps a pan past the far edge so the trailing edge meets the frame', () => {
    const settled = clampPan(
      { zoom: 1, panX: -5000, panY: -4000 },
      { width: 2000, height: 900 },
      frame,
    );

    expect(settled).toEqual({ zoom: 1, panX: -1000, panY: -300 });
  });

  it('centres only the axis on which the scaled content fits', () => {
    const settled = clampPan(
      { zoom: 1, panX: 400, panY: 400 },
      { width: 2000, height: 200 },
      frame,
    );

    expect(settled).toEqual({ zoom: 1, panX: 0, panY: 200 });
  });

  it('scales the content by the zoom before deciding whether it fits', () => {
    const content: Size = { width: 500, height: 300 };

    expect(clampPan({ zoom: 1, panX: 0, panY: 0 }, content, frame)).toEqual({
      zoom: 1,
      panX: 250,
      panY: 150,
    });
    expect(clampPan({ zoom: 4, panX: 0, panY: 0 }, content, frame)).toEqual({
      zoom: 4,
      panX: 0,
      panY: 0,
    });
  });

  it('leaves the pan untouched for a zero or negative dimension', () => {
    const pan: Viewport = { zoom: 1, panX: 77, panY: -33 };

    expect(clampPan(pan, { width: 0, height: 0 }, frame)).toEqual(pan);
    expect(clampPan(pan, { width: -400, height: -200 }, frame)).toEqual(pan);
    expect(clampPan(pan, { width: 400, height: 200 }, { width: 0, height: 0 })).toEqual(pan);
  });

  it('leaves the pan untouched for a non-finite dimension', () => {
    const pan: Viewport = { zoom: 1, panX: 77, panY: -33 };

    expect(clampPan(pan, { width: Number.NaN, height: Number.NaN }, frame)).toEqual(pan);
    expect(
      clampPan(pan, { width: 400, height: 200 }, { width: Number.POSITIVE_INFINITY, height: 600 }),
    ).toEqual({ zoom: 1, panX: 77, panY: 200 });
  });

  it('returns a new object rather than mutating its argument', () => {
    const before: Viewport = { zoom: 1, panX: 400, panY: 400 };
    const after = clampPan(before, { width: 2000, height: 900 }, frame);

    expect(after).not.toBe(before);
    expect(before).toEqual({ zoom: 1, panX: 400, panY: 400 });
  });
});

describe('centrePan', () => {
  const frame: Size = { width: 1000, height: 600 };

  it('centres content smaller than the frame', () => {
    expect(centrePan({ zoom: 1, panX: 900, panY: 0 }, { width: 400, height: 200 }, frame)).toEqual({
      zoom: 1,
      panX: 300,
      panY: 200,
    });
  });

  it('overhangs the frame evenly for content larger than it', () => {
    expect(centrePan({ zoom: 1, panX: 0, panY: 0 }, { width: 2000, height: 900 }, frame)).toEqual({
      zoom: 1,
      panX: -500,
      panY: -150,
    });
  });

  it('survives a clamp unchanged, whichever side the content falls', () => {
    const wide = centrePan({ zoom: 2, panX: 0, panY: 0 }, { width: 2000, height: 100 }, frame);

    expect(clampPan(wide, { width: 2000, height: 100 }, frame)).toEqual(wide);
  });

  it('leaves the pan untouched for a degenerate dimension', () => {
    const pan: Viewport = { zoom: 1, panX: 77, panY: -33 };

    expect(centrePan(pan, { width: 0, height: Number.NaN }, frame)).toEqual(pan);
  });
});

describe('canPan', () => {
  const frame: Size = { width: 1000, height: 600 };

  it('reports nothing to pan when the content fits on both axes', () => {
    expect(canPan({ width: 400, height: 200 }, frame, 1)).toBe(false);
  });

  it('reports nothing to pan when the content matches the frame exactly', () => {
    expect(canPan({ width: 1000, height: 600 }, frame, 1)).toBe(false);
  });

  it('reports something to pan when the content is wider than the frame', () => {
    expect(canPan({ width: 1400, height: 200 }, frame, 1)).toBe(true);
  });

  it('reports something to pan when the content is taller than the frame', () => {
    expect(canPan({ width: 400, height: 900 }, frame, 1)).toBe(true);
  });

  it('reports something to pan when the content overflows on both axes', () => {
    expect(canPan({ width: 1400, height: 900 }, frame, 1)).toBe(true);
  });

  it('measures the content at the given zoom rather than at its natural size', () => {
    const content: Size = { width: 600, height: 400 };

    expect(canPan(content, frame, 1)).toBe(false);
    expect(canPan(content, frame, 2)).toBe(true);
    expect(canPan({ width: 1400, height: 900 }, frame, 0.5)).toBe(false);
  });

  it('reports nothing to pan for a degenerate content size', () => {
    expect(canPan({ width: 0, height: 0 }, frame, 1)).toBe(false);
    expect(canPan({ width: -1400, height: -900 }, frame, 1)).toBe(false);
    expect(canPan({ width: Number.NaN, height: Number.NaN }, frame, 1)).toBe(false);
  });

  it('reports nothing to pan for a degenerate frame size', () => {
    const content: Size = { width: 1400, height: 900 };

    expect(canPan(content, { width: 0, height: 0 }, 1)).toBe(false);
    expect(canPan(content, { width: Number.NaN, height: Number.NaN }, 1)).toBe(false);
  });

  it('reports nothing to pan for a degenerate zoom', () => {
    const content: Size = { width: 1400, height: 900 };

    expect(canPan(content, frame, 0)).toBe(false);
    expect(canPan(content, frame, Number.NaN)).toBe(false);
    expect(canPan(content, frame, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('pinchStep', () => {
  const content: Size = { width: 400, height: 600 };
  const frame: Size = { width: 400, height: 600 };
  const bounds = { content, frame, floor: 1 };
  const still = { scale: 1, cx: 200, cy: 300, dx: 0, dy: 0 };

  it('keeps the content under the fingers under their midpoint as they spread', () => {
    const next = pinchStep(identity, { ...still, scale: 2, cx: 100, cy: 150 }, bounds);

    expect(next.zoom).toBe(2);
    expect(contentUnder(next, 100, 150)).toEqual(contentUnder(identity, 100, 150));
  });

  it('carries the content along with a moving midpoint before zooming around it', () => {
    const start: Viewport = { zoom: 2, panX: -200, panY: -300 };
    const before = contentUnder(start, 180, 280);
    const next = pinchStep(start, { scale: 1.5, cx: 200, cy: 300, dx: 20, dy: 20 }, bounds);

    expect(next.zoom).toBe(3);
    expect(contentUnder(next, 200, 300).x).toBeCloseTo(before.x);
    expect(contentUnder(next, 200, 300).y).toBeCloseTo(before.y);
  });

  it('pans with two fingers that move without spreading', () => {
    const start: Viewport = { zoom: 2, panX: -200, panY: -300 };

    expect(pinchStep(start, { ...still, dx: 30, dy: -40 }, bounds)).toEqual({
      zoom: 2,
      panX: -170,
      panY: -340,
    });
  });

  it('stops at the fit rather than shrinking the page below it', () => {
    const start: Viewport = { zoom: 1.5, panX: -100, panY: -150 };

    expect(pinchStep(start, { ...still, scale: 0.25 }, bounds).zoom).toBe(1);
  });

  it('never raises a zoom that already sits below the fit', () => {
    const start: Viewport = { zoom: 0.5, panX: 100, panY: 150 };

    expect(pinchStep(start, { ...still, scale: 0.5 }, bounds).zoom).toBe(0.5);
    expect(pinchStep(start, { ...still, scale: 1.2 }, bounds).zoom).toBeCloseTo(0.6);
  });

  it('stops at the maximum zoom', () => {
    const start: Viewport = { zoom: 6, panX: 0, panY: 0 };

    expect(pinchStep(start, { ...still, scale: 4 }, bounds).zoom).toBe(MAX_ZOOM);
  });

  it('clamps the pan so the page cannot be dragged off the frame', () => {
    const start: Viewport = { zoom: 2, panX: 0, panY: 0 };

    expect(pinchStep(start, { ...still, dx: 500, dy: 500 }, bounds)).toEqual({
      zoom: 2,
      panX: 0,
      panY: 0,
    });
  });

  it('treats a non-finite scale or delta as no change', () => {
    const start: Viewport = { zoom: 2, panX: -100, panY: -100 };

    expect(
      pinchStep(start, { scale: Number.NaN, cx: 0, cy: 0, dx: Number.NaN, dy: 1 / 0 }, bounds),
    ).toEqual(start);
  });
});

describe('pinchZoom', () => {
  it('scales the zoom by the pinch', () => {
    expect(pinchZoom(1, 1.5, 1)).toBe(1.5);
    expect(pinchZoom(2, 0.75, 1)).toBe(1.5);
  });

  it('stops a pinch-in at the fit', () => {
    expect(pinchZoom(1.2, 0.5, 1)).toBe(1);
    expect(pinchZoom(1, 0.5, 1)).toBe(1);
  });

  it('neither raises nor lowers a zoom already below the fit', () => {
    expect(pinchZoom(0.5, 0.5, 1)).toBe(0.5);
    expect(pinchZoom(0.5, 1.2, 1)).toBe(0.6);
  });

  it('stops a pinch-out at the maximum zoom', () => {
    expect(pinchZoom(MAX_ZOOM, 2, 1)).toBe(MAX_ZOOM);
  });

  it('holds the zoom for a scale that is not a positive number', () => {
    expect(pinchZoom(1.5, Number.NaN, 1)).toBe(1.5);
    expect(pinchZoom(1.5, 0, 1)).toBe(1.5);
    expect(pinchZoom(1.5, -2, 1)).toBe(1.5);
  });
});

describe('doubleTapTarget', () => {
  const at = { x: 120, y: 300 };

  it('zooms from the fit to two and a half times the fit around the tapped point', () => {
    const target = doubleTapTarget(identity, 1, at);

    expect(target.kind).toBe('zoom');
    expect(target.viewport.zoom).toBe(DOUBLE_TAP_ZOOM);
    expect(contentUnder(target.viewport, at.x, at.y)).toEqual(contentUnder(identity, at.x, at.y));
  });

  it('measures the zoom-in from the fit, not from the zoom it starts at', () => {
    expect(doubleTapTarget({ zoom: 0.5, panX: 0, panY: 0 }, 0.8, at).viewport.zoom).toBeCloseTo(
      0.8 * DOUBLE_TAP_ZOOM,
    );
  });

  it('returns to the fit from any zoom above it, keeping the tapped point still', () => {
    const start: Viewport = { zoom: 1.5, panX: -80, panY: -120 };
    const target = doubleTapTarget(start, 1, at);

    expect(target.kind).toBe('fit');
    expect(target.viewport.zoom).toBeCloseTo(1);
    expect(contentUnder(target.viewport, at.x, at.y).x).toBeCloseTo(
      contentUnder(start, at.x, at.y).x,
    );
  });

  it('counts a zoom a hair above the fit as the fit', () => {
    expect(doubleTapTarget({ zoom: 1.005, panX: 0, panY: 0 }, 1, at).kind).toBe('zoom');
  });

  it('caps the zoom-in at the maximum zoom', () => {
    expect(doubleTapTarget({ zoom: 4, panX: 0, panY: 0 }, 4, at).viewport.zoom).toBe(MAX_ZOOM);
  });
});
