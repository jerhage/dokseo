import {
  clampTo,
  imageRect,
  isEmpty,
  normalize,
  screenRect,
  type ImageRect,
  type ScreenRect,
  type Size,
} from '$lib/shared/geometry';
import type { ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';

export type PageFraction = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export type PlacedImage = {
  readonly index: ImageIndex;
  readonly onScreen: ScreenRect;
  readonly natural: Size;
};

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function frameOf(placed: PlacedImage): ScreenRect | null {
  if (!isPositiveFinite(placed.natural.width) || !isPositiveFinite(placed.natural.height)) {
    return null;
  }

  const frame = normalize(placed.onScreen);
  if (!Number.isFinite(frame.x) || !Number.isFinite(frame.y)) return null;
  if (!isPositiveFinite(frame.width) || !isPositiveFinite(frame.height)) return null;

  return frame;
}

export function toImageRect(placed: PlacedImage, selection: ScreenRect): ImageRect | null {
  const frame = frameOf(placed);
  if (frame === null) return null;

  const overlap = clampTo(selection, frame);
  if (isEmpty(overlap)) return null;

  const scaleX = placed.natural.width / frame.width;
  const scaleY = placed.natural.height / frame.height;

  return imageRect(
    (overlap.x - frame.x) * scaleX,
    (overlap.y - frame.y) * scaleY,
    overlap.width * scaleX,
    overlap.height * scaleY,
  );
}

export function toScreenRect(placed: PlacedImage, rect: ImageRect): ScreenRect {
  const frame = frameOf(placed);
  if (frame === null) return screenRect(0, 0, 0, 0);

  const region = normalize(rect);
  const scaleX = frame.width / placed.natural.width;
  const scaleY = frame.height / placed.natural.height;

  return screenRect(
    frame.x + region.x * scaleX,
    frame.y + region.y * scaleY,
    region.width * scaleX,
    region.height * scaleY,
  );
}

export function toPageFraction(natural: Size, rect: ImageRect): PageFraction | null {
  if (!isPositiveFinite(natural.width) || !isPositiveFinite(natural.height)) return null;

  const box = clampTo(normalize(rect), imageRect(0, 0, natural.width, natural.height));
  if (isEmpty(box)) return null;

  return {
    left: (box.x / natural.width) * 100,
    top: (box.y / natural.height) * 100,
    width: (box.width / natural.width) * 100,
    height: (box.height / natural.height) * 100,
  };
}

export function regionsIn(
  placed: readonly PlacedImage[],
  selection: ScreenRect,
): readonly ImageRegion[] {
  const regions: ImageRegion[] = [];

  for (const image of placed) {
    const rect = toImageRect(image, selection);
    if (rect !== null) regions.push({ index: image.index, rect });
  }

  return regions;
}
