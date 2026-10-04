import { clampTo, imageRect, isEmpty, normalize, pageRect, pageRectOf } from '$lib/shared/geometry';
import type { ImageRect, PageRect, ScreenRect, Size } from '$lib/shared/geometry';
import type { ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';

type PageFraction = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

type PlacedImage = {
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

function toImageRect(placed: PlacedImage, selection: ScreenRect): ImageRect | null {
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

function toPageFraction(rect: PageRect): PageFraction | null {
  const box = clampTo(normalize(rect), pageRect(0, 0, 1, 1));
  if (isEmpty(box)) return null;

  return {
    left: box.x * 100,
    top: box.y * 100,
    width: box.width * 100,
    height: box.height * 100,
  };
}

function pixelRectsIn(placed: readonly PlacedImage[], selection: ScreenRect): readonly ImageRect[] {
  return placed.flatMap((image) => toImageRect(image, selection) ?? []);
}

function regionsIn(placed: readonly PlacedImage[], selection: ScreenRect): readonly ImageRegion[] {
  const regions: ImageRegion[] = [];

  for (const image of placed) {
    const pixels = toImageRect(image, selection);
    const rect = pixels === null ? null : pageRectOf(pixels, image.natural);
    if (rect !== null) regions.push({ index: image.index, rect });
  }

  return regions;
}

export { toImageRect, toPageFraction, pixelRectsIn, regionsIn };
export type { PageFraction, PlacedImage };
