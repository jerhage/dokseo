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
