import { match } from 'ts-pattern';
import type { Size } from '$lib/shared/geometry';

export type Viewport = { readonly zoom: number; readonly panX: number; readonly panY: number };

export type FitMode = 'height' | 'width' | 'contain';

export const MIN_ZOOM = 0.1;

export const MAX_ZOOM = 8;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function fitRatio(frameExtent: number, contentExtent: number): number | null {
  if (!isPositiveFinite(frameExtent) || !isPositiveFinite(contentExtent)) return null;
  return frameExtent / contentExtent;
}

export function clampZoom(zoom: number): number {
  if (!isPositiveFinite(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { zoom: viewport.zoom, panX: viewport.panX + dx, panY: viewport.panY + dy };
}

export function zoomAt(
  viewport: Viewport,
  factor: number,
  anchorX: number,
  anchorY: number,
): Viewport {
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

export function clampPan(viewport: Viewport, content: Size, frame: Size): Viewport {
  return {
    zoom: viewport.zoom,
    panX: clampExtent(viewport.panX, content.width, frame.width, viewport.zoom),
    panY: clampExtent(viewport.panY, content.height, frame.height, viewport.zoom),
  };
}

export function centrePan(viewport: Viewport, content: Size, frame: Size): Viewport {
  return {
    zoom: viewport.zoom,
    panX: centreExtent(viewport.panX, content.width, frame.width, viewport.zoom),
    panY: centreExtent(viewport.panY, content.height, frame.height, viewport.zoom),
  };
}

export function fitZoom(content: Size, frame: Size, mode: FitMode): number {
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
