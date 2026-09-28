import { screenRect } from '$lib/shared/geometry';
import type { Size } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { PlacedImage } from '../domain/placement';

function naturalSizeOf(element: Element): Size | null {
  if (element instanceof HTMLImageElement) {
    return { width: element.naturalWidth, height: element.naturalHeight };
  }

  if (element instanceof HTMLCanvasElement) {
    return { width: element.width, height: element.height };
  }

  return null;
}

function placedImages(elements: Iterable<Element>): readonly PlacedImage[] {
  const placed: PlacedImage[] = [];

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;

    const natural = naturalSizeOf(element);
    if (natural === null) continue;

    const index = Number(element.dataset.imageIndex);
    if (!Number.isInteger(index)) continue;

    const box = element.getBoundingClientRect();
    placed.push({
      index: imageIndex(index),
      onScreen: screenRect(box.x, box.y, box.width, box.height),
      natural,
    });
  }

  return placed;
}

export { naturalSizeOf, placedImages };
