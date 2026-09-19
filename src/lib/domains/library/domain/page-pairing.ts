import { imageIndex, type ImageIndex } from '$lib/shared/ids';
import type { PagePairing } from '$lib/shared/layout-kind';

export type PageGroup = readonly ImageIndex[];

function singles(count: number): readonly PageGroup[] {
  const groups: PageGroup[] = [];
  for (let index = 0; index < count; index += 1) groups.push([imageIndex(index)]);
  return groups;
}

function pairsFrom(start: number, count: number): readonly PageGroup[] {
  const groups: PageGroup[] = [];
  for (let index = start; index < count; index += 2) {
    const next = index + 1;
    groups.push(next < count ? [imageIndex(index), imageIndex(next)] : [imageIndex(index)]);
  }
  return groups;
}

export function pairPages(count: number, pairing: PagePairing): readonly PageGroup[] {
  if (!Number.isInteger(count) || count <= 0) return [];
  if (count === 1) return singles(1);

  switch (pairing) {
    case 'single':
      return singles(count);
    case 'double':
      return pairsFrom(0, count);
    case 'double-after-cover':
      return [[imageIndex(0)], ...pairsFrom(1, count)];
  }
}

export function groupContaining(groups: readonly PageGroup[], index: ImageIndex): number {
  return groups.findIndex((group) => group.includes(index));
}
