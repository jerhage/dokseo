import { describe, expect, it } from 'vitest';
import { clampPan } from '$lib/ui/components/pan-zoom';
import type { Viewport } from '$lib/ui/components/pan-zoom';
import type { Size } from '$lib/shared/geometry';
import { FIT_HEIGHT_ZOOM, arrivalViewport, pageFitZoom } from './viewport';
import type { Framing, ViewportFit } from './viewport';

describe('arrivalViewport', () => {
  const frame: Size = { width: 390, height: 811 };
  const narrow: Framing = { content: { width: 270, height: 811 }, frame };
  const tall: Framing = { content: { width: 324.5, height: 811 }, frame };
  const spread: Framing = { content: { width: 540, height: 811 }, frame };
  const zoomedIn: Viewport = { zoom: 2.5, panX: -700, panY: -1200 };
  const fits: readonly ViewportFit[] = ['height', 'width', 'free'];

  it('centres a narrow page at the height fit, whatever the zoom it leaves', () => {
    expect(arrivalViewport('height', zoomedIn, narrow)).toEqual({
      zoom: FIT_HEIGHT_ZOOM,
      panX: 60,
      panY: 0,
    });
  });

  it('fits the width from the arriving page and shows its middle', () => {
    const zoom = 390 / 324.5;

    const landed = arrivalViewport('width', { zoom: 1.4, panX: 0, panY: -90 }, tall);

    expect(landed.zoom).toBe(zoom);
    expect(landed.panX).toBeCloseTo(0, 9);
    expect(landed.panY).toBeCloseTo((811 - 811 * zoom) / 2, 9);
  });

  it('keeps a free zoom and centres the wide page it makes, overhanging both sides', () => {
    expect(arrivalViewport('free', zoomedIn, narrow)).toEqual({
      zoom: 2.5,
      panX: (390 - 270 * 2.5) / 2,
      panY: (811 - 811 * 2.5) / 2,
    });
  });

  it('centres a spread of two pages wider than the frame at the height fit', () => {
    expect(arrivalViewport('height', zoomedIn, spread)).toEqual({ zoom: 1, panX: -75, panY: 0 });
  });

  it('returns the viewport it was given while the sizes are unknown', () => {
    expect(arrivalViewport('width', zoomedIn, null)).toBe(zoomedIn);
  });

  it('lands where a later fit or clamp leaves it, so nothing moves after the turn', () => {
    for (const fit of fits) {
      for (const framing of [narrow, tall, spread]) {
        const landed = arrivalViewport(fit, zoomedIn, framing);

        expect(arrivalViewport(fit, landed, framing)).toEqual(landed);
        expect(clampPan(landed, framing.content, framing.frame)).toEqual(landed);
      }
    }
  });
});

describe('pageFitZoom', () => {
  const frame: Size = { width: 390, height: 811 };
  const tall: Framing = { content: { width: 324.5, height: 811 }, frame };

  it.each([
    { fit: 'height', zoom: FIT_HEIGHT_ZOOM },
    { fit: 'width', zoom: 390 / 324.5 },
  ] as const)('returns the zoom a $fit fit gives the page', ({ fit, zoom }) => {
    expect(pageFitZoom(fit, tall)).toBe(zoom);
  });
});
