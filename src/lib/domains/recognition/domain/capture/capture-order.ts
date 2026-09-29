import { match } from 'ts-pattern';
import type { Anchor, TextAnchor } from '$lib/shared/anchor';
import type { ImageRect } from '$lib/shared/geometry';
import type { ImageRegion } from '$lib/shared/image-region';
import type { ReadingDirection } from '$lib/shared/layout-kind';

type Placed = { readonly anchor: Anchor };

type Passaged = { readonly anchor: TextAnchor };

type PassageOrder = (earlier: string, later: string) => number;

type Ordering =
  | { readonly kind: 'by-geometry'; readonly regions: readonly ImageRegion[] }
  | { readonly kind: 'by-passage'; readonly cfi: string };

const EARLIER = -1;

const LATER = 1;

function orderingOf(anchor: Anchor): Ordering {
  if (anchor.kind === 'text') return { kind: 'by-passage', cfi: anchor.cfi };

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

function comparePassageCfis(earlier: string, later: string, passages: PassageOrder): number {
  if (earlier.length === 0) return later.length === 0 ? 0 : LATER;
  if (later.length === 0) return EARLIER;

  return passages(earlier, later);
}

function comparePlaces(
  earlier: Placed,
  later: Placed,
  direction: ReadingDirection,
  passages: PassageOrder,
): number {
  return match([orderingOf(earlier.anchor), orderingOf(later.anchor)] as const)
    .with([{ kind: 'by-geometry' }, { kind: 'by-geometry' }], ([first, second]) =>
      compareGeometry(first.regions, second.regions, direction),
    )
    .with([{ kind: 'by-passage' }, { kind: 'by-passage' }], ([first, second]) =>
      comparePassageCfis(first.cfi, second.cfi, passages),
    )
    .with([{ kind: 'by-geometry' }, { kind: 'by-passage' }], () => EARLIER)
    .with([{ kind: 'by-passage' }, { kind: 'by-geometry' }], () => LATER)
    .exhaustive();
}

function inBookOrder<T extends Placed>(
  captures: readonly T[],
  direction: ReadingDirection,
  passages: PassageOrder,
): readonly T[] {
  return captures.toSorted((earlier, later) => comparePlaces(earlier, later, direction, passages));
}

function inPassageOrder<T extends Passaged>(
  captures: readonly T[],
  order: PassageOrder,
): readonly T[] {
  return captures.toSorted((earlier, later) => order(earlier.anchor.cfi, later.anchor.cfi));
}

export { inBookOrder, inPassageOrder };
export type { PassageOrder };
