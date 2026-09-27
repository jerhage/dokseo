import { match } from 'ts-pattern';

type Size = { readonly width: number; readonly height: number };

type Viewport = { readonly zoom: number; readonly panX: number; readonly panY: number };

type FitMode = 'height' | 'width' | 'contain';

type Pinch = {
  readonly scale: number;
  readonly cx: number;
  readonly cy: number;
  readonly dx: number;
  readonly dy: number;
};

type PinchBounds = { readonly content: Size; readonly frame: Size; readonly floor: number };

type ZoomPoint = { readonly x: number; readonly y: number };

type DoubleTapTarget =
  | { readonly kind: 'fit'; readonly viewport: Viewport }
  | { readonly kind: 'zoom'; readonly viewport: Viewport };

const MIN_ZOOM = 0.1;

const MAX_ZOOM = 8;

const DOUBLE_TAP_ZOOM = 2.5;

const ZOOM_STEP = 1.2;

const FIT_TOLERANCE = 1.01;

const WHEEL_DELTA_LINE = 1;

const WHEEL_DELTA_PAGE = 2;

const WHEEL_LINE_PX = 16;

const WHEEL_ZOOM_SPAN = 320;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function fitRatio(frameExtent: number, contentExtent: number): number | null {
  if (!isPositiveFinite(frameExtent) || !isPositiveFinite(contentExtent)) return null;
  return frameExtent / contentExtent;
}

function clampZoom(zoom: number): number {
  if (!isPositiveFinite(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { zoom: viewport.zoom, panX: viewport.panX + dx, panY: viewport.panY + dy };
}

function zoomAt(viewport: Viewport, factor: number, anchorX: number, anchorY: number): Viewport {
  const from = clampZoom(viewport.zoom);
  const zoom = clampZoom(from * factor);
  const applied = zoom / from;

  return {
    zoom,
    panX: anchorX - (anchorX - viewport.panX) * applied,
    panY: anchorY - (anchorY - viewport.panY) * applied,
  };
}

function centredExtent(frameExtent: number, scaledExtent: number): number {
  return (frameExtent - scaledExtent) / 2;
}

function clampExtent(
  pan: number,
  contentExtent: number,
  frameExtent: number,
  zoom: number,
): number {
  const scaled = contentExtent * zoom;
  if (!isPositiveFinite(scaled) || !isPositiveFinite(frameExtent)) return pan;
  if (scaled <= frameExtent) return centredExtent(frameExtent, scaled);
  return Math.min(0, Math.max(frameExtent - scaled, pan));
}

function centreExtent(
  pan: number,
  contentExtent: number,
  frameExtent: number,
  zoom: number,
): number {
  const scaled = contentExtent * zoom;
  if (!isPositiveFinite(scaled) || !isPositiveFinite(frameExtent)) return pan;
  return centredExtent(frameExtent, scaled);
}

function overflows(contentExtent: number, frameExtent: number, zoom: number): boolean {
  const scaled = contentExtent * zoom;
  if (!isPositiveFinite(scaled) || !isPositiveFinite(frameExtent)) return false;
  return scaled > frameExtent;
}

function canPan(content: Size, frame: Size, zoom: number): boolean {
  return (
    overflows(content.width, frame.width, zoom) || overflows(content.height, frame.height, zoom)
  );
}

function clampPan(viewport: Viewport, content: Size, frame: Size): Viewport {
  return {
    zoom: viewport.zoom,
    panX: clampExtent(viewport.panX, content.width, frame.width, viewport.zoom),
    panY: clampExtent(viewport.panY, content.height, frame.height, viewport.zoom),
  };
}

function centrePan(viewport: Viewport, content: Size, frame: Size): Viewport {
  return {
    zoom: viewport.zoom,
    panX: centreExtent(viewport.panX, content.width, frame.width, viewport.zoom),
    panY: centreExtent(viewport.panY, content.height, frame.height, viewport.zoom),
  };
}

function fitZoom(content: Size, frame: Size, mode: FitMode): number {
  return match(mode)
    .with('height', () => {
      const ratio = fitRatio(frame.height, content.height);
      return ratio === null ? MIN_ZOOM : clampZoom(ratio);
    })
    .with('width', () => {
      const ratio = fitRatio(frame.width, content.width);
      return ratio === null ? MIN_ZOOM : clampZoom(ratio);
    })
    .with('contain', () => {
      const byWidth = fitRatio(frame.width, content.width);
      const byHeight = fitRatio(frame.height, content.height);
      if (byWidth === null || byHeight === null) return MIN_ZOOM;
      return clampZoom(Math.min(byWidth, byHeight));
    })
    .exhaustive();
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function pinchStep(viewport: Viewport, pinch: Pinch, bounds: PinchBounds): Viewport {
  const moved = panBy(viewport, finiteOr(pinch.dx, 0), finiteOr(pinch.dy, 0));
  const from = clampZoom(viewport.zoom);
  const floor = Math.min(from, clampZoom(bounds.floor));
  const scale = isPositiveFinite(pinch.scale) ? pinch.scale : 1;
  const zoom = Math.max(floor, from * scale);

  return clampPan(zoomAt(moved, zoom / from, pinch.cx, pinch.cy), bounds.content, bounds.frame);
}

function pinchZoom(zoom: number, scale: number, fit: number): number {
  const from = clampZoom(zoom);
  const floor = Math.min(from, clampZoom(fit));
  const factor = isPositiveFinite(scale) ? scale : 1;

  return clampZoom(Math.max(floor, from * factor));
}

function doubleTapTarget(viewport: Viewport, fit: number, point: ZoomPoint): DoubleTapTarget {
  const from = clampZoom(viewport.zoom);
  const home = clampZoom(fit);

  if (from > home * FIT_TOLERANCE) {
    return { kind: 'fit', viewport: zoomAt(viewport, home / from, point.x, point.y) };
  }

  return {
    kind: 'zoom',
    viewport: zoomAt(viewport, (home * DOUBLE_TAP_ZOOM) / from, point.x, point.y),
  };
}

function wheelPixels(delta: number, mode: number, extent: number): number {
  if (mode === WHEEL_DELTA_LINE) return delta * WHEEL_LINE_PX;
  if (mode === WHEEL_DELTA_PAGE) return delta * extent;
  return delta;
}

function wheelZoomFactor(pixels: number): number {
  return Math.exp(-pixels / WHEEL_ZOOM_SPAN);
}

export {
  DOUBLE_TAP_ZOOM,
  FIT_TOLERANCE,
  MIN_ZOOM,
  MAX_ZOOM,
  WHEEL_DELTA_LINE,
  WHEEL_DELTA_PAGE,
  WHEEL_LINE_PX,
  WHEEL_ZOOM_SPAN,
  ZOOM_STEP,
  clampZoom,
  panBy,
  zoomAt,
  canPan,
  clampPan,
  centrePan,
  fitZoom,
  pinchStep,
  pinchZoom,
  doubleTapTarget,
  wheelPixels,
  wheelZoomFactor,
};
export type { DoubleTapTarget, FitMode, Pinch, PinchBounds, Size, Viewport, ZoomPoint };
