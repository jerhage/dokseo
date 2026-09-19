import { normalize, screenRect, type ScreenRect, type Size } from '$lib/shared/geometry';
import type { ImageRegion } from '$lib/shared/image-region';

export type Point = { readonly x: number; readonly y: number };

export type Arrangement = 'row' | 'column';

export const MIN_SELECTION_PX = 12;

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function selectionFrom(from: Point, to: Point): ScreenRect {
  if (!isFinitePoint(from) || !isFinitePoint(to)) return screenRect(0, 0, 0, 0);

  return normalize(screenRect(from.x, from.y, to.x - from.x, to.y - from.y));
}

export function isUsableSelection(selection: ScreenRect): boolean {
  const rect = normalize(selection);
  return rect.width >= MIN_SELECTION_PX && rect.height >= MIN_SELECTION_PX;
}

export function selectionSize(regions: readonly ImageRegion[], arrangement: Arrangement): Size {
  const stacked = arrangement === 'column';
  let width = 0;
  let height = 0;

  for (const region of regions) {
    const rect = normalize(region.rect);
    if (stacked) {
      width = Math.max(width, rect.width);
      height += rect.height;
    } else {
      width += rect.width;
      height = Math.max(height, rect.height);
    }
  }

  return { width, height };
}
