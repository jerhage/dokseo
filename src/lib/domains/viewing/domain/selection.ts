import type { Arrangement } from '$lib/shared/arrangement';
import { normalize, screenRect } from '$lib/shared/geometry';
import type { ScreenRect, Size } from '$lib/shared/geometry';
import type { ImageRegion } from '$lib/shared/image-region';

type Point = { readonly x: number; readonly y: number };

const MIN_SELECTION_PX = 12;

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function selectionFrom(from: Point, to: Point): ScreenRect {
  if (!isFinitePoint(from) || !isFinitePoint(to)) return screenRect(0, 0, 0, 0);

  return normalize(screenRect(from.x, from.y, to.x - from.x, to.y - from.y));
}

function isUsableSelection(selection: ScreenRect): boolean {
  const rect = normalize(selection);
  return rect.width >= MIN_SELECTION_PX && rect.height >= MIN_SELECTION_PX;
}

function isTap(from: Point, to: Point): boolean {
  const moved = selectionFrom(from, to);
  return moved.width < MIN_SELECTION_PX && moved.height < MIN_SELECTION_PX;
}

function selectionSize(regions: readonly ImageRegion[], arrangement: Arrangement): Size {
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

export { MIN_SELECTION_PX, selectionFrom, isUsableSelection, isTap, selectionSize };
export type { Point };
