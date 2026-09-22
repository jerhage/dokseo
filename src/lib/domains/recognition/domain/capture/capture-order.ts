import type { Anchor } from '$lib/shared/anchor';
import type { ImageRect } from '$lib/shared/geometry';
import type { ImageRegion } from '$lib/shared/image-region';
import type { ReadingDirection } from '$lib/shared/layout-kind';

type Placed = { readonly anchor: Anchor };

type Ordering =
  | { readonly kind: 'by-geometry'; readonly regions: readonly ImageRegion[] }
  | { readonly kind: 'in-the-order-given' };

const IN_THE_ORDER_GIVEN: Ordering = { kind: 'in-the-order-given' };

const KEEPS_THE_ORDER_GIVEN = 0;

function orderingOf(anchor: Anchor): Ordering {
  if (anchor.kind === 'text') return IN_THE_ORDER_GIVEN;

  return { kind: 'by-geometry', regions: anchor.regions };
}

function alongReading(rect: ImageRect, direction: ReadingDirection): number {
  return direction === 'rtl' ? -(rect.x + rect.width) : rect.y;
}

function acrossReading(rect: ImageRect, direction: ReadingDirection): number {
  return direction === 'rtl' ? rect.y : rect.x;
}

function compareGeometry(
  earlier: readonly ImageRegion[],
  later: readonly ImageRegion[],
  direction: ReadingDirection,
): number {
  const first = earlier[0];
  const second = later[0];
  if (first === undefined) return second === undefined ? 0 : 1;
  if (second === undefined) return -1;
  if (first.index !== second.index) return first.index - second.index;

  const along = alongReading(first.rect, direction) - alongReading(second.rect, direction);
  if (along !== 0) return along;

  return acrossReading(first.rect, direction) - acrossReading(second.rect, direction);
}

function comparePlaces(earlier: Placed, later: Placed, direction: ReadingDirection): number {
  const first = orderingOf(earlier.anchor);
  const second = orderingOf(later.anchor);
  if (first.kind === 'in-the-order-given' || second.kind === 'in-the-order-given') {
    return KEEPS_THE_ORDER_GIVEN;
  }

  return compareGeometry(first.regions, second.regions, direction);
}

function inBookOrder<T extends Placed>(
  captures: readonly T[],
  direction: ReadingDirection,
): readonly T[] {
  return captures.toSorted((earlier, later) => comparePlaces(earlier, later, direction));
}

export { inBookOrder };
