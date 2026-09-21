import { screenRect } from '$lib/shared/geometry';
import type { Size } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { PlacedImage } from '../domain/placement';

function naturalSizeOf(element: Element): Size | null {
  if (element.tagName === 'IMG') {
    const image = element as HTMLImageElement;
    return { width: image.naturalWidth, height: image.naturalHeight };
  }

  if (element.tagName === 'CANVAS') {
    const canvas = element as HTMLCanvasElement;
    return { width: canvas.width, height: canvas.height };
  }

  return null;
}

function placedImages(elements: Iterable<Element>): readonly PlacedImage[] {
  const placed: PlacedImage[] = [];

  for (const element of elements) {
    const natural = naturalSizeOf(element);
    if (natural === null) continue;

    const index = Number((element as HTMLElement).dataset.imageIndex);
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
