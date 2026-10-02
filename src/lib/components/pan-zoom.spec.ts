import { describe, expect, it } from 'vitest';
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
  WHEEL_DELTA_LINE,
  WHEEL_DELTA_PAGE,
  WHEEL_LINE_PX,
  WHEEL_ZOOM_SPAN,
  wheelPixels,
  wheelZoomFactor,
  zoomAt,
  ZOOM_STEP,
} from './pan-zoom';
import type { Size, Viewport } from './pan-zoom';

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

  const UNUSABLE_ZOOMS: readonly number[] = [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    0,
    -3,
  ];

  it('falls back to the minimum for a zero, negative or non-finite zoom', () => {
    for (const zoom of UNUSABLE_ZOOMS) {
      expect(clampZoom(zoom), String(zoom)).toBe(MIN_ZOOM);
    }
  });
});

describe('panBy', () => {
  it('shifts the pan by the delta and leaves the zoom alone', () => {
    const moved = panBy({ zoom: 2.5, panX: 10, panY: -20 }, 30, 45);

    expect(moved).toEqual({ zoom: 2.5, panX: 40, panY: 25 });
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

  const FITS: readonly (readonly [string, Size, 'height' | 'width' | 'contain', number])[] = [
    ['taller than the frame by height', taller, 'height', 0.5],
    ['taller than the frame by width', taller, 'width', 1.25],
    ['taller than the frame by contain, taking the smaller ratio', taller, 'contain', 0.5],
    ['wider than the frame by height', wider, 'height', 1.2],
    ['wider than the frame by width', wider, 'width', 0.5],
    ['wider than the frame by contain, taking the smaller ratio', wider, 'contain', 0.5],
  ];

  it('fits content taller or wider than the frame by height, by width and by contain, taking the smaller ratio', () => {
    for (const [name, content, fit, zoom] of FITS) {
      expect(fitZoom(content, frame, fit), name).toBeCloseTo(zoom);
    }
  });

  const DEGENERATE_FITS: readonly (readonly [
    string,
    Size,
    Size,
    'height' | 'width' | 'contain',
  ])[] = [
    ['a zero content height', { width: 800, height: 0 }, frame, 'height'],
    ['a zero content width', { width: 0, height: 1200 }, frame, 'width'],
    ['a zero frame height', taller, { width: 1000, height: 0 }, 'contain'],
    ['a zero frame width', taller, { width: 0, height: 600 }, 'contain'],
    ['a content height that is not a number', { width: 800, height: Number.NaN }, frame, 'height'],
    [
      'an infinite content width',
      { width: Number.POSITIVE_INFINITY, height: 1200 },
      frame,
      'width',
    ],
    ['a frame height that is not a number', taller, { width: 1000, height: Number.NaN }, 'contain'],
    ['a negative content height', { width: 800, height: -1200 }, frame, 'height'],
    ['a negative frame width', taller, { width: -1000, height: 600 }, 'width'],
  ];

  it('returns the minimum zoom for a zero, non-finite or negative dimension', () => {
    for (const [name, content, box, fit] of DEGENERATE_FITS) {
      expect(fitZoom(content, box, fit), name).toBe(MIN_ZOOM);
    }
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

  it('leaves the pan untouched for a zero, negative or non-finite dimension', () => {
    const pan: Viewport = { zoom: 1, panX: 77, panY: -33 };

    expect(clampPan(pan, { width: 0, height: 0 }, frame)).toEqual(pan);
    expect(clampPan(pan, { width: -400, height: -200 }, frame)).toEqual(pan);
    expect(clampPan(pan, { width: 400, height: 200 }, { width: 0, height: 0 })).toEqual(pan);
    expect(clampPan(pan, { width: Number.NaN, height: Number.NaN }, frame)).toEqual(pan);
    expect(
      clampPan(pan, { width: 400, height: 200 }, { width: Number.POSITIVE_INFINITY, height: 600 }),
    ).toEqual({ zoom: 1, panX: 77, panY: 200 });
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

  const OVERFLOWS: readonly (readonly [string, Size])[] = [
    ['wider than the frame', { width: 1400, height: 200 }],
    ['taller than the frame', { width: 400, height: 900 }],
    ['overflowing on both axes', { width: 1400, height: 900 }],
  ];

  it('reports something to pan when the content overflows the frame on either axis or both', () => {
    for (const [name, content] of OVERFLOWS) {
      expect(canPan(content, frame, 1), name).toBe(true);
    }
  });

  it('measures the content at the given zoom rather than at its natural size', () => {
    const content: Size = { width: 600, height: 400 };

    expect(canPan(content, frame, 1)).toBe(false);
    expect(canPan(content, frame, 2)).toBe(true);
    expect(canPan({ width: 1400, height: 900 }, frame, 0.5)).toBe(false);
  });

  const OVERFLOWING: Size = { width: 1400, height: 900 };

  const DEGENERATE_PANS: readonly (readonly [string, Size, Size, number])[] = [
    ['a zero content size', { width: 0, height: 0 }, frame, 1],
    ['a negative content size', { width: -1400, height: -900 }, frame, 1],
    ['a content size that is not a number', { width: Number.NaN, height: Number.NaN }, frame, 1],
    ['a zero frame size', OVERFLOWING, { width: 0, height: 0 }, 1],
    [
      'a frame size that is not a number',
      OVERFLOWING,
      { width: Number.NaN, height: Number.NaN },
      1,
    ],
    ['a zero zoom', OVERFLOWING, frame, 0],
    ['a zoom that is not a number', OVERFLOWING, frame, Number.NaN],
    ['an infinite zoom', OVERFLOWING, frame, Number.POSITIVE_INFINITY],
  ];

  it('reports nothing to pan for a degenerate content size, frame size or zoom', () => {
    for (const [name, content, box, zoom] of DEGENERATE_PANS) {
      expect(canPan(content, box, zoom), name).toBe(false);
    }
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

  it('counts a zoom a hair above the fit as the fit, and one a step further as above it', () => {
    expect(doubleTapTarget({ zoom: 1.005, panX: 0, panY: 0 }, 1, at).kind).toBe('zoom');
    expect(doubleTapTarget({ zoom: 1.02, panX: 0, panY: 0 }, 1, at).kind).toBe('fit');
  });

  it('caps the zoom-in at the maximum zoom', () => {
    expect(doubleTapTarget({ zoom: 4, panX: 0, panY: 0 }, 4, at).viewport.zoom).toBe(MAX_ZOOM);
  });
});

describe('wheelPixels', () => {
  it('passes a pixel delta through', () => {
    expect(wheelPixels(-120, 0, 900)).toBe(-120);
  });

  it('reads a line delta as that many lines of the line height', () => {
    expect(wheelPixels(3, WHEEL_DELTA_LINE, 900)).toBe(3 * WHEEL_LINE_PX);
  });

  it('reads a page delta as that share of the extent', () => {
    expect(wheelPixels(0.5, WHEEL_DELTA_PAGE, 900)).toBe(450);
  });

  it('holds the DOM delta modes and a 16 px line', () => {
    expect([WHEEL_DELTA_LINE, WHEEL_DELTA_PAGE, WHEEL_LINE_PX]).toEqual([1, 2, 16]);
  });
});

describe('wheelZoomFactor', () => {
  it('zooms in for a wheel turned up and out for one turned down', () => {
    expect(wheelZoomFactor(-120)).toBeGreaterThan(1);
    expect(wheelZoomFactor(120)).toBeLessThan(1);
  });

  it('multiplies to one over a turn up and the same turn down', () => {
    expect(wheelZoomFactor(-90) * wheelZoomFactor(90)).toBeCloseTo(1, 12);
  });

  it('zooms by e for each span of pixels turned up', () => {
    expect(WHEEL_ZOOM_SPAN).toBe(320);
    expect(wheelZoomFactor(-WHEEL_ZOOM_SPAN)).toBeCloseTo(Math.E, 12);
  });
});

describe('ZOOM_STEP', () => {
  it('steps the zoom by a fifth, and a step out undoes a step in about the same point', () => {
    const back = zoomAt(zoomAt(identity, ZOOM_STEP, 120, 80), 1 / ZOOM_STEP, 120, 80);

    expect(ZOOM_STEP).toBe(1.2);
    expect(back.zoom).toBeCloseTo(1, 12);
    expect(back.panX).toBeCloseTo(0, 9);
    expect(back.panY).toBeCloseTo(0, 9);
  });
});
