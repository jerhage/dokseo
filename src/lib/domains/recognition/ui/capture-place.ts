import type { ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';

export const NO_PLACE = 'no page';

export function pageLabel(index: ImageIndex): string {
  return String(index + 1).padStart(3, '0');
}

export function placeLabel(regions: readonly ImageRegion[]): string {
  const first = regions[0];
  const last = regions.at(-1);
  if (first === undefined || last === undefined) return NO_PLACE;

  const span =
    first.index === last.index
      ? `p.${pageLabel(first.index)}`
      : `p.${pageLabel(first.index)}–${pageLabel(last.index)}`;

  return regions.length > 1 ? `${span} · ${regions.length} regions` : span;
}

export function firstImage(regions: readonly ImageRegion[]): ImageIndex | null {
  return regions[0]?.index ?? null;
}
