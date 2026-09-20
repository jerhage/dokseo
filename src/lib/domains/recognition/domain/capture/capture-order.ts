import type { ImageRect } from '$lib/shared/geometry';
import type { ImageRegion } from '$lib/shared/image-region';
import type { ReadingDirection } from '$lib/shared/layout-kind';

type Placed = { readonly regions: readonly ImageRegion[] };

function alongReading(rect: ImageRect, direction: ReadingDirection): number {
  return direction === 'rtl' ? -(rect.x + rect.width) : rect.y;
}

function acrossReading(rect: ImageRect, direction: ReadingDirection): number {
  return direction === 'rtl' ? rect.y : rect.x;
}

function comparePlaces(earlier: Placed, later: Placed, direction: ReadingDirection): number {
  const first = earlier.regions[0];
  const second = later.regions[0];
  if (first === undefined) return second === undefined ? 0 : 1;
  if (second === undefined) return -1;
  if (first.index !== second.index) return first.index - second.index;

  const along = alongReading(first.rect, direction) - alongReading(second.rect, direction);
  if (along !== 0) return along;

  return acrossReading(first.rect, direction) - acrossReading(second.rect, direction);
}

function inBookOrder<T extends Placed>(
  captures: readonly T[],
  direction: ReadingDirection,
): readonly T[] {
  return captures.toSorted((earlier, later) => comparePlaces(earlier, later, direction));
}

export { inBookOrder };
