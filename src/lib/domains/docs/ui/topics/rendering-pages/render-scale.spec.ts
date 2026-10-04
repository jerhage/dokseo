import { describe, expect, it } from 'vitest';
import { imageRect, screenRect } from '$lib/shared/geometry';
import {
  CAPTURE_PRESETS,
  captureAt,
  devicePixelsPerPagePixel,
  readAgainstScale,
  rectFigure,
  renderedSize,
  selectionOver,
} from './render-scale';

const DISPLAY = screenRect(0, 0, 300, 420);

describe('renderedSize', () => {
  it('multiplies the page size in points by the scale and rounds up', () => {
    expect(renderedSize(1)).toEqual({ width: 360, height: 504 });
    expect(renderedSize(2)).toEqual({ width: 720, height: 1008 });
    expect(renderedSize(1.5)).toEqual({ width: 540, height: 756 });
  });
});

describe('captureAt', () => {
  it('maps one screen selection to twice the pixel numbers at scale 2', () => {
    const selection = selectionOver(DISPLAY, CAPTURE_PRESETS.bubble);

    const one = captureAt(DISPLAY, selection, 1);
    const two = captureAt(DISPLAY, selection, 2);

    expect(one?.rect.x).toBeCloseTo(196);
    expect(one?.rect.width).toBeCloseTo(130);
    expect(two?.rect.x).toBeCloseTo(392);
    expect(two?.rect.width).toBeCloseTo(260);
  });

  it('places the box at the same fraction of the page at every scale', () => {
    const selection = selectionOver(DISPLAY, CAPTURE_PRESETS.caption);

    const one = captureAt(DISPLAY, selection, 1);
    const two = captureAt(DISPLAY, selection, 2);

    expect(one?.box.left).toBeCloseTo(two?.box.left ?? Number.NaN);
    expect(one?.box.top).toBeCloseTo(two?.box.top ?? Number.NaN);
  });

  it('finds nothing for a selection beside the page', () => {
    expect(captureAt(DISPLAY, screenRect(400, 0, 20, 20), 2)).toBeNull();
  });
});

describe('readAgainstScale', () => {
  it('places a scale 2 rect read at scale 1 twice as far from the corner and twice as large', () => {
    const box = readAgainstScale(imageRect(60, 60, 240, 80), 1);

    expect(box?.left).toBeCloseTo((60 / 360) * 100);
    expect(box?.width).toBeCloseTo((240 / 360) * 100);
  });

  it('places it past the page entirely when the rect starts beyond the scale 1 edge', () => {
    expect(readAgainstScale(imageRect(392, 80, 20, 20), 1)).toBeNull();
  });

  it('places a rect in the same spot when read at the scale it was taken at', () => {
    const box = readAgainstScale(imageRect(36, 50.4, 72, 100.8), 1);

    expect(box?.left).toBeCloseTo(10);
    expect(box?.top).toBeCloseTo(10);
  });
});

describe('devicePixelsPerPagePixel', () => {
  it('counts how many device pixels draw one page pixel', () => {
    expect(devicePixelsPerPagePixel(360, 3, 360)).toBe(3);
    expect(devicePixelsPerPagePixel(360, 3, 720)).toBe(1.5);
  });

  it('reports zero for an empty page', () => {
    expect(devicePixelsPerPagePixel(360, 2, 0)).toBe(0);
  });
});

describe('rectFigure', () => {
  it('writes a rect in whole pixels', () => {
    expect(rectFigure(imageRect(10.4, 20.6, 30.5, 40))).toBe('x 10, y 21, 31 × 40');
  });
});
