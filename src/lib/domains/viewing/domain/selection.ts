import type { Arrangement } from '$lib/shared/arrangement';
import { normalize } from '$lib/shared/geometry';
import type { Size } from '$lib/shared/geometry';
import type { ImageRegion } from '$lib/shared/image-region';

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

export { MIN_SELECTION_PX, selectionSize };
export type { Point };
