import type { Arrangement } from '$lib/shared/arrangement';
import { normalize } from '$lib/shared/geometry';
import type { ScreenRect, Size } from '$lib/shared/geometry';
import type { ImageRegion } from '$lib/shared/image-region';
import { regionsIn } from './placement';
import type { PlacedImage } from './placement';

type Point = { readonly x: number; readonly y: number };

const MIN_SELECTION_PX = 12;

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

function drawnSize(
  placed: readonly PlacedImage[],
  selection: ScreenRect,
  arrangement: Arrangement,
): Size | null {
  const regions = regionsIn(placed, selection);
  return regions.length === 0 ? null : selectionSize(regions, arrangement);
}

function sizeLabel(size: Size): string {
  return `${Math.round(size.width)} × ${Math.round(size.height)}`;
}

export { MIN_SELECTION_PX, drawnSize, selectionSize, sizeLabel };
export type { Point };
