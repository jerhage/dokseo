import { describe, expect, it } from 'vitest';
import {
  canPan,
  centrePan,
  clampPan,
  doubleTapTarget,
  fitZoom,
  pinchStep,
  zoomAt,
} from '$lib/components/pan-zoom';
import type { Viewport } from '$lib/components/pan-zoom';
import type { Size } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { PageFit } from '$lib/shared/page-fit';
import { FIT_HEIGHT_ZOOM, arrivalViewport } from '../domain/viewport';
import type { ReaderGesture } from './gesture-hint';
import { PagedViewport } from './paged-viewport.svelte';
import type { FrameOffset } from './paged-viewport.svelte';

type World = {
  readonly view: PagedViewport;
  readonly learned: ReaderGesture[];
  frame: Size | null;
  content: Size;
  offset: FrameOffset | null;
};

const FRAME: Size = { width: 400, height: 600 };

const PAGE: Size = { width: 300, height: 600 };

const FITTED: Viewport = { zoom: FIT_HEIGHT_ZOOM, panX: 0, panY: 0 };

function world(pageFit: PageFit = 'height'): World {
  const learned: ReaderGesture[] = [];
  const state: World = {
    learned,
    frame: FRAME,
    content: PAGE,
    offset: { left: 20, top: 40 },
    view: new PagedViewport(
      {
        boxes: () => {
          const frame = state.frame;
          if (frame === null) return null;
          const zoom = state.view.viewport.zoom;
          return {
            frame,
            strip: { width: state.content.width * zoom, height: state.content.height * zoom },
          };
        },
        offset: () => state.offset,
      },
      () => pageFit,
      (gesture) => learned.push(gesture),
    ),
  };
  return state;
}

function centred(zoom: number): Viewport {
  return centrePan({ zoom, panX: 0, panY: 0 }, PAGE, FRAME);
}

describe('PagedViewport', () => {
  it('starts fitted to the height under the fit the book asks for, and cannot pan', () => {
    const { view } = world('width');

    expect(view.viewport).toEqual(FITTED);
    expect(view.fit).toBe('width');
    expect(view.pannable).toBe(false);
  });

  it('fits the width by zooming the page to the frame and centring it', () => {
    const { view } = world();

    view.fitWidth();

    const zoom = fitZoom(PAGE, FRAME, 'width');
    expect(view.fit).toBe('width');
    expect(view.viewport).toEqual(centred(zoom));
    expect(view.pannable).toBe(true);
  });

  it('chooses the width fit but keeps the viewport while nothing is framed', () => {
    const held = world();
    held.frame = null;

    held.view.fitWidth();

    expect(held.view.fit).toBe('width');
    expect(held.view.viewport).toEqual(FITTED);
  });

  it('fits the height by going back to the fitted zoom, centred', () => {
    const { view } = world();
    view.fitWidth();

    view.fitHeight();

    expect(view.fit).toBe('height');
    expect(view.viewport).toEqual(centred(FIT_HEIGHT_ZOOM));
    expect(view.pannable).toBe(false);
  });

  it('fits the height without centring while nothing is framed', () => {
    const held = world();
    held.view.stepZoom(2);
    const panned = held.view.viewport;
    held.frame = null;

    held.view.fitHeight();

    expect(held.view.viewport).toEqual({
      zoom: FIT_HEIGHT_ZOOM,
      panX: panned.panX,
      panY: panned.panY,
    });
  });

  it('steps the zoom about the centre of the frame, frees the fit and teaches panning', () => {
    const held = world();

    held.view.stepZoom(2);

    const expected = clampPan(zoomAt(FITTED, 2, 200, 300), PAGE, FRAME);
    expect(held.view.viewport).toEqual(expected);
    expect(held.view.fit).toBe('free');
    expect(held.view.pannable).toBe(true);
    expect(held.learned).toEqual(['zoom-to-pan']);
  });

  it('steps nothing while nothing is framed', () => {
    const held = world();
    held.frame = null;

    held.view.stepZoom(2);

    expect(held.view.viewport).toEqual(FITTED);
    expect(held.view.fit).toBe('height');
  });

  it('teaches nothing when a zoom leaves the page unable to pan', () => {
    const held = world();

    held.view.zoomAt(0.5, 0, 0);

    expect(held.view.fit).toBe('free');
    expect(held.view.pannable).toBe(false);
    expect(held.learned).toEqual([]);
  });

  it('zooms at a point it is given', () => {
    const { view } = world();

    view.zoomAt(2, 10, 20);

    expect(view.viewport).toEqual(clampPan(zoomAt(FITTED, 2, 10, 20), PAGE, FRAME));
  });

  it('pans within the page', () => {
    const { view } = world();
    view.stepZoom(2);
    const zoomed = view.viewport;

    view.panBy(-10_000, 15);

    expect(view.viewport).toEqual(
      clampPan({ zoom: 2, panX: zoomed.panX - 10_000, panY: zoomed.panY + 15 }, PAGE, FRAME),
    );
    expect(view.fit).toBe('free');
  });

  it('pans without a limit while nothing is framed, and keeps whether it could pan', () => {
    const held = world();
    held.view.stepZoom(2);
    const zoomed = held.view.viewport;
    held.frame = null;

    held.view.panBy(-10_000, 0);

    expect(held.view.viewport.panX).toBe(zoomed.panX - 10_000);
    expect(held.view.pannable).toBe(true);
  });

  it('pinches about the fingers measured from the frame, no smaller than the fit', () => {
    const held = world();
    const pinch = { scale: 2, cx: 220, cy: 340, dx: 3, dy: 4 };

    held.view.pinch(pinch);

    const expected = clampPan(
      pinchStep(
        FITTED,
        { ...pinch, cx: 200, cy: 300 },
        { content: PAGE, frame: FRAME, floor: FIT_HEIGHT_ZOOM },
      ),
      PAGE,
      FRAME,
    );
    expect(held.view.viewport).toEqual(expected);
    expect(held.view.fit).toBe('free');
  });

  it('floors a pinch at the width fit when the book fits the width', () => {
    const held = world('width');
    held.view.fitWidth();

    held.view.pinch({ scale: 0.1, cx: 220, cy: 340, dx: 0, dy: 0 });

    expect(held.view.viewport.zoom).toBe(fitZoom(PAGE, FRAME, 'width'));
  });

  it('ignores a pinch while the frame has no box', () => {
    const held = world();
    held.offset = null;

    held.view.pinch({ scale: 2, cx: 0, cy: 0, dx: 0, dy: 0 });

    expect(held.view.viewport).toEqual(FITTED);
  });

  it('ignores a pinch while nothing is framed', () => {
    const held = world();
    held.frame = null;

    held.view.pinch({ scale: 2, cx: 0, cy: 0, dx: 0, dy: 0 });

    expect(held.view.viewport).toEqual(FITTED);
  });

  it('zooms in on a double tap at the point measured from the frame', () => {
    const held = world();

    held.view.doubleTap({ x: 120, y: 240 });

    const target = doubleTapTarget(FITTED, FIT_HEIGHT_ZOOM, { x: 100, y: 200 });
    expect(target.kind).toBe('zoom');
    expect(held.view.viewport).toEqual(clampPan(target.viewport, PAGE, FRAME));
    expect(held.view.fit).toBe('free');
    expect(held.learned).toEqual(['zoom-to-pan']);
  });

  it('goes back to the book fit on a double tap while zoomed in', () => {
    const held = world('width');
    held.view.stepZoom(4);
    const zoomed = held.view.viewport;

    held.view.doubleTap({ x: 120, y: 240 });

    const target = doubleTapTarget(zoomed, fitZoom(PAGE, FRAME, 'width'), { x: 100, y: 200 });
    expect(target.kind).toBe('fit');
    expect(held.view.viewport).toEqual(clampPan(target.viewport, PAGE, FRAME));
    expect(held.view.fit).toBe('width');
  });

  it('ignores a double tap while the frame has no box or nothing is framed', () => {
    const noBox = world();
    noBox.offset = null;
    noBox.view.doubleTap({ x: 0, y: 0 });
    const unframed = world();
    unframed.frame = null;
    unframed.view.doubleTap({ x: 0, y: 0 });

    expect([noBox.view.viewport, unframed.view.viewport]).toEqual([FITTED, FITTED]);
  });

  it('arrives on a group by its measured page and frame, under the fit', () => {
    const held = world('width');
    held.view.fitWidth();
    held.frame = null;
    held.view.framed(FRAME);
    held.view.measured(imageIndex(4), { width: 200, height: 600 });

    held.view.arrive(imageIndex(4));

    const framing = { content: { width: 200, height: 600 }, frame: FRAME };
    expect(held.view.viewport).toEqual(
      arrivalViewport('width', centred(fitZoom(PAGE, FRAME, 'width')), framing),
    );
    expect(held.view.pannable).toBe(canPan(framing.content, FRAME, 2));
  });

  it('prefers the measured page to the strip on screen', () => {
    const held = world();
    held.view.framed(FRAME);
    held.view.measured(imageIndex(4), { width: 600, height: 1200 });

    held.view.arrive(imageIndex(4));

    expect(held.view.viewport).toEqual(centrePan(FITTED, { width: 600, height: 1200 }, FRAME));
    expect(held.view.pannable).toBe(true);
  });

  it('arrives by the strip on screen when the page is not measured yet', () => {
    const held = world();
    held.view.stepZoom(2);
    const zoomed = held.view.viewport;

    held.view.arrive(imageIndex(1));

    expect(held.view.viewport).toEqual(
      arrivalViewport('free', zoomed, { content: PAGE, frame: FRAME }),
    );
  });

  it('arrives by the strip once a measured page is forgotten', () => {
    const held = world('width');
    held.view.framed(FRAME);
    held.view.measured(imageIndex(4), { width: 200, height: 600 });
    held.view.forget(imageIndex(4));

    held.view.arrive(imageIndex(4));

    expect(held.view.viewport.zoom).toBe(fitZoom(PAGE, FRAME, 'width'));
  });

  it('arrives by the strip while the frame is not measured', () => {
    const held = world('width');
    held.view.measured(imageIndex(4), { width: 200, height: 600 });

    held.view.arrive(imageIndex(4));

    expect(held.view.viewport.zoom).toBe(fitZoom(PAGE, FRAME, 'width'));
  });

  it('keeps the viewport on arriving with nothing measured or framed', () => {
    const held = world('width');
    held.frame = null;

    held.view.arrive(undefined);

    expect(held.view.viewport).toEqual(FITTED);
  });

  it('draws the shown pane at the viewport and a beside pane as it will arrive', () => {
    const held = world('width');
    held.view.framed(FRAME);
    held.view.measured(imageIndex(2), { width: 200, height: 600 });

    const shown = held.view.paneViewport({ key: imageIndex(0), beside: 0 });
    const beside = held.view.paneViewport({ key: imageIndex(2), beside: 1 });
    const unmeasured = held.view.paneViewport({ key: imageIndex(6), beside: -1 });

    expect(shown).toBe(held.view.viewport);
    expect(beside).toEqual(
      arrivalViewport('width', FITTED, { content: { width: 200, height: 600 }, frame: FRAME }),
    );
    expect(unmeasured).toBe(held.view.viewport);
  });

  it('refits to the fit it holds', () => {
    const width = world();
    width.view.fitWidth();
    width.content = { width: 200, height: 600 };
    width.view.refit();
    const height = world();
    height.content = { width: 600, height: 300 };
    height.view.refit();

    expect(width.view.viewport.zoom).toBeCloseTo(
      fitZoom({ width: 200, height: 600 }, FRAME, 'width'),
    );
    expect(height.view.viewport).toEqual(centrePan(FITTED, { width: 600, height: 300 }, FRAME));
  });

  it('refits a free zoom by clamping the pan', () => {
    const held = world();
    held.view.stepZoom(2);
    held.view.panBy(-150, 0);
    const zoomed = held.view.viewport;
    held.content = { width: 210, height: 600 };

    held.view.refit();

    expect(held.view.fit).toBe('free');
    expect(held.view.viewport).toEqual(clampPan(zoomed, { width: 210, height: 600 }, FRAME));
  });

  it('reaches from the viewport it held when the pan began', () => {
    const held = world();
    held.view.stepZoom(2);
    const origin = held.view.viewport;
    held.view.holdPanOrigin();
    held.view.panBy(0, 30);

    expect(held.view.viewport).not.toEqual(origin);
    expect(held.view.panReach()).toEqual({ origin, content: PAGE, frame: FRAME });
  });

  it('reaches from the fitted viewport before any pan began', () => {
    expect(world().view.panReach()).toEqual({ origin: FITTED, content: PAGE, frame: FRAME });
  });

  it('reaches nowhere while nothing is framed', () => {
    const held = world();
    held.frame = null;

    expect(held.view.panReach()).toBeNull();
  });
});
