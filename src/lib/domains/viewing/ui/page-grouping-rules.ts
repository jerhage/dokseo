import type { Size } from '$lib/shared/geometry';
import type { ImageIndex } from '$lib/shared/ids';
import { effectivePairing, imageLayoutKind } from '$lib/shared/layout-kind';
import type { PagePairing, ScreenWidth } from '$lib/shared/layout-kind';
import { imagePlace } from '$lib/shared/reading-place';
import type { ImagePlace } from '$lib/shared/reading-place';
import { groupContaining, pairPages } from '../domain/page-pairing';
import type { PageGroup } from '../domain/page-pairing';
import type { ReaderBook } from './reader-opening';

type PageSizes = readonly (Size | null)[];

const NO_PAGES: PageGroup = [];

const NO_GROUPS: readonly PageGroup[] = [];

function unmeasured(count: number): PageSizes {
  return Array.from({ length: Math.max(count, 0) }, () => null);
}

function withSize(sizes: PageSizes, index: ImageIndex, size: Size): PageSizes {
  if (index < 0 || index >= sizes.length) return sizes;

  const known = sizes[index] ?? null;
  if (known !== null && known.width === size.width && known.height === size.height) return sizes;

  const next = [...sizes];
  next[index] = size;
  return next;
}

function mergedSizes(known: PageSizes, found: PageSizes): PageSizes {
  const merged = known.map((size, index) => size ?? found[index] ?? null);
  return merged.every((size, index) => size === known[index]) ? known : merged;
}

function pairingOf(book: ReaderBook | null, screen: ScreenWidth): PagePairing | null {
  if (book === null) return null;
  const layout = imageLayoutKind(book.layoutKind);
  return layout === null ? null : effectivePairing(book.pagePairing, layout, screen);
}

function groupsOf(
  book: ReaderBook | null,
  sizes: PageSizes,
  pairing: PagePairing | null,
): readonly PageGroup[] {
  return book === null || pairing === null ? NO_GROUPS : pairPages(sizes, pairing);
}

function groupHolding(groups: readonly PageGroup[], index: ImageIndex): PageGroup {
  return groups[groupContaining(groups, index)] ?? NO_PAGES;
}

function placeShowing(groups: readonly PageGroup[], index: ImageIndex): ImagePlace {
  return imagePlace(index, groupHolding(groups, index).at(-1) ?? index);
}

export {
  NO_GROUPS,
  NO_PAGES,
  groupHolding,
  groupsOf,
  mergedSizes,
  pairingOf,
  placeShowing,
  unmeasured,
  withSize,
};
export type { PageSizes };
