import { describe, expect, it } from 'vitest';
import { MAX_ZOOM, ZOOM_STEP } from '$lib/ui/components/pan-zoom';
import type { Size } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ReadingPosition } from '../domain/reading-position';
import { FIT_WIDTH_ZOOM, createStripZoom } from './strip-zoom.svelte';

type Held = { sizes: readonly (Size | null)[]; frameWidth: number };

const SIZES: readonly Size[] = [
  { width: 100, height: 200 },
  { width: 100, height: 100 },
  { width: 100, height: 300 },
];

const START: ReadingPosition = { index: imageIndex(0), offset: 0 };

type StripZoomHook = ReturnType<typeof createStripZoom>;

function strip(held: Held = { sizes: SIZES, frameWidth: 400 }): StripZoomHook {
  return createStripZoom(() => held, START);
}

describe('createStripZoom', () => {
  it('starts at fit width, holding the start and reading nothing', () => {
    const zoom = strip();

    expect([zoom.zoom, zoom.atFitWidth, zoom.width]).toEqual([FIT_WIDTH_ZOOM, true, 400]);
    expect(zoom.hold).toEqual({ position: START, top: 0, across: 0, left: 0 });
    expect(zoom.reading).toBeNull();
  });

  it('lays the strip out at the frame width times the zoom', () => {
    const held = { sizes: SIZES, frameWidth: 400 };
    const zoom = strip(held);
    zoom.zoomBy(2, { top: 0, left: 0 }, { x: 0, y: 0 });

    expect(zoom.width).toBe(800);
    expect(zoom.layout.map((slice) => slice.height)).toEqual([1600, 800, 2400]);
  });

  it('reads its sizes and frame width again on each access', () => {
    const held: Held = { sizes: SIZES, frameWidth: 400 };
    const zoom = strip(held);
    const before = zoom.width;

    held.frameWidth = 300;
    held.sizes = SIZES.slice(0, 1);

    expect(before).toBe(400);
    expect(zoom.width).toBe(300);
    expect(zoom.layout).toHaveLength(1);
  });

  it('holds the point under a zoom, measured on the strip before it zooms', () => {
    const zoom = strip();
    zoom.follow();

    zoom.zoomBy(ZOOM_STEP, { top: 800, left: 100 }, { x: 100, y: 200 });

    expect(zoom.zoom).toBe(ZOOM_STEP);
    expect(zoom.reading).toBeNull();
    expect(zoom.hold).toEqual({
      position: { index: imageIndex(1), offset: 0.5 },
      top: 200,
      across: 0.5,
      left: 100,
    });
  });

  it('changes nothing when the zoom is already at its limit', () => {
    const zoom = strip();
    zoom.zoomBy(MAX_ZOOM, { top: 0, left: 0 }, { x: 0, y: 0 });
    zoom.follow();
    const hold = zoom.hold;
    const reading = zoom.reading;

    zoom.zoomBy(2, { top: 800, left: 100 }, { x: 100, y: 200 });

    expect(zoom.zoom).toBe(MAX_ZOOM);
    expect(zoom.hold).toBe(hold);
    expect(zoom.reading).toBe(reading);
    expect(reading).not.toBeNull();
  });

  it('answers the factor back to fit width', () => {
    const zoom = strip();
    zoom.zoomBy(2, { top: 0, left: 0 }, { x: 0, y: 0 });

    expect(zoom.toFitWidth).toBe(0.5);
    expect(zoom.atFitWidth).toBe(false);

    zoom.zoomBy(zoom.toFitWidth, { top: 0, left: 0 }, { x: 0, y: 0 });

    expect(zoom.atFitWidth).toBe(true);
  });

  it('zooms by a pinch, holding where it began and pinning where the fingers are', () => {
    const zoom = strip();
    zoom.follow();

    const zoomed = zoom.pinch(2, { top: 800, left: 0 }, { x: 200, y: 200 }, { x: 50, y: 100 });

    expect(zoomed).toBe(true);
    expect(zoom.zoom).toBe(2);
    expect(zoom.reading).toBeNull();
    expect(zoom.hold).toEqual({
      position: { index: imageIndex(1), offset: 0.5 },
      top: 100,
      across: 0.5,
      left: 50,
    });
  });

  it('holds the pinch but keeps the zoom when it cannot shrink below fit width', () => {
    const zoom = strip();
    zoom.follow();

    const zoomed = zoom.pinch(0.5, { top: 800, left: 0 }, { x: 200, y: 200 }, { x: 50, y: 100 });

    expect(zoomed).toBe(false);
    expect(zoom.zoom).toBe(FIT_WIDTH_ZOOM);
    expect(zoom.reading).toBeNull();
    expect(zoom.hold.top).toBe(100);
  });

  it.each<{
    readonly how: string;
    readonly act: (zoom: StripZoomHook) => void;
    readonly target: { readonly top: number; readonly left: number };
  }>([
    {
      how: 'a pinch that keeps the zoom',
      act: (zoom) => zoom.pinch(1, { top: 800, left: 0 }, { x: 200, y: 200 }, { x: 50, y: 100 }),
      target: { top: 900, left: 150 },
    },
    {
      how: 'a pinch to twice the zoom',
      act: (zoom) => zoom.pinch(2, { top: 800, left: 0 }, { x: 200, y: 200 }, { x: 50, y: 100 }),
      target: { top: 1900, left: 350 },
    },
    {
      how: 'a zoom to twice the width',
      act: (zoom) => zoom.zoomBy(2, { top: 0, left: 200 }, { x: 0, y: 0 }),
      target: { top: 0, left: 400 },
    },
  ])('scrolls to the held place on the zoomed strip after $how', ({ act, target }) => {
    const zoom = strip();
    act(zoom);

    expect(zoom.target).toEqual(target);
  });

  it('settles on the place at a scroll and reads the slice it sits in', () => {
    const zoom = strip();

    zoom.settleAt({ top: 1000, left: 100 });

    expect(zoom.hold).toEqual({
      position: { index: imageIndex(1), offset: 0.5 },
      top: 0,
      across: 0.25,
      left: 0,
    });
    expect(zoom.reading).toEqual({ index: imageIndex(1), edge: 800, width: 400 });
  });

  it('follows the held slice to where the layout puts it now', () => {
    const held: Held = { sizes: SIZES, frameWidth: 400 };
    const zoom = strip(held);
    zoom.settleAt({ top: 1000, left: 0 });

    held.frameWidth = 200;
    zoom.follow();

    expect(zoom.reading).toEqual({ index: imageIndex(1), edge: 400, width: 200 });
  });

  it('stays put when asked for the image it already holds', () => {
    const zoom = strip();
    zoom.follow();
    const hold = zoom.hold;

    const moved = zoom.goTo({ index: imageIndex(0), offset: 0.5 });

    expect(moved).toBe(false);
    expect(zoom.hold).toBe(hold);
    expect(zoom.reading).not.toBeNull();
  });

  it('goes to another image at its top, keeping the share across', () => {
    const zoom = strip();
    zoom.settleAt({ top: 0, left: 100 });
    const asked = { index: imageIndex(2), offset: 0.25 };

    const moved = zoom.goTo(asked);

    expect(moved).toBe(true);
    expect(zoom.reading).toBeNull();
    expect(zoom.hold).toEqual({ position: asked, top: 0, across: 0.25, left: 0 });
  });
});
