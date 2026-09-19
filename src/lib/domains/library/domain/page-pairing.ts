import { imageIndex, type ImageIndex } from '$lib/shared/ids';
import type { Size } from '$lib/shared/geometry';
import type { PagePairing } from '$lib/shared/layout-kind';

export type PageGroup = readonly ImageIndex[];

const WIDE_ASPECT_RATIO = 1;

function isWide(size: Size | null | undefined): boolean {
  if (!size) return false;
  const { width, height } = size;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width <= 0 || height <= 0) return false;
  return width / height > WIDE_ASPECT_RATIO;
}

function singles(count: number): readonly PageGroup[] {
  const groups: PageGroup[] = [];
  for (let index = 0; index < count; index += 1) groups.push([imageIndex(index)]);
  return groups;
}

function pairsFrom(sizes: readonly (Size | null)[], start: number): readonly PageGroup[] {
  const groups: PageGroup[] = [];
  let index = start;
  while (index < sizes.length) {
    const next = index + 1;
    const pairs = !isWide(sizes[index]) && next < sizes.length && !isWide(sizes[next]);
    groups.push(pairs ? [imageIndex(index), imageIndex(next)] : [imageIndex(index)]);
    index += pairs ? 2 : 1;
  }
  return groups;
}

export function pairPages(
  sizes: readonly (Size | null)[],
  pairing: PagePairing,
): readonly PageGroup[] {
  if (sizes.length === 0) return [];

  switch (pairing) {
    case 'single':
      return singles(sizes.length);
    case 'double':
      return pairsFrom(sizes, 0);
    case 'double-after-cover':
      return [[imageIndex(0)], ...pairsFrom(sizes, 1)];
  }
}

export function groupContaining(groups: readonly PageGroup[], index: ImageIndex): number {
  return groups.findIndex((group) => group.includes(index));
}
