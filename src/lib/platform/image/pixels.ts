import type { Arrangement } from '$lib/shared/arrangement';
import { clampTo, imageRect, normalize } from '$lib/shared/geometry';
import type { ImageRect, Size } from '$lib/shared/geometry';
import { own } from './bitmap';
import type { OwnedBitmap } from './bitmap';

const RED_WEIGHT = 0.2126;

const GREEN_WEIGHT = 0.7152;

const BLUE_WEIGHT = 0.0722;

const GROUND = '#ffffff';

export const MAX_CROP_EDGE = 2048;

function surfaceFor(
  width: number,
  height: number,
  readBack: boolean,
): OffscreenCanvasRenderingContext2D {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: readBack });
  if (context === null) {
    throw new Error(`A 2D drawing context was unavailable for a ${width}x${height} surface`);
  }
  return context;
}

function wholePixels(rect: ImageRect): ImageRect {
  const x = Math.floor(rect.x);
  const y = Math.floor(rect.y);
  return imageRect(x, y, Math.ceil(rect.x + rect.width) - x, Math.ceil(rect.y + rect.height) - y);
}

function usable(value: number): boolean {
  return Number.isFinite(value) && value >= 1;
}

function lumaAt(data: Uint8ClampedArray, offset: number): number {
  return (
    RED_WEIGHT * (data[offset] ?? 0) +
    GREEN_WEIGHT * (data[offset + 1] ?? 0) +
    BLUE_WEIGHT * (data[offset + 2] ?? 0)
  );
}

export function downscaleFor(size: Size): number {
  const edge = Math.max(size.width, size.height);
  if (!Number.isFinite(edge) || edge <= 0) return 1;

  return Math.min(1, MAX_CROP_EDGE / edge);
}

export function cropFrom(bitmap: ImageBitmap, rect: ImageRect): OwnedBitmap {
  const bounds = imageRect(0, 0, bitmap.width, bitmap.height);
  const area = wholePixels(clampTo(normalize(rect), bounds));
  if (!usable(area.width) || !usable(area.height)) {
    throw new Error(
      `A ${rect.width}x${rect.height} region at ${rect.x},${rect.y} covers no pixels of a ${bitmap.width}x${bitmap.height} image`,
    );
  }

  const context = surfaceFor(area.width, area.height, false);
  context.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return own(context.canvas.transferToImageBitmap());
}

export function stitch(parts: readonly ImageBitmap[], arrangement: Arrangement): OwnedBitmap {
  if (parts.length === 0) throw new Error('No parts were given to stitch');

  const stacked = arrangement === 'column';
  let along = 0;
  let across = 0;
  for (const part of parts) {
    along += stacked ? part.height : part.width;
    across = Math.max(across, stacked ? part.width : part.height);
  }

  const width = stacked ? across : along;
  const height = stacked ? along : across;
  if (!usable(width) || !usable(height)) {
    throw new Error(`${parts.length} parts stitch to an empty ${width}x${height} image`);
  }

  const context = surfaceFor(width, height, false);
  context.fillStyle = GROUND;
  context.fillRect(0, 0, width, height);

  let placed = 0;
  for (const part of parts) {
    const centred = Math.round((across - (stacked ? part.width : part.height)) / 2);
    if (stacked) context.drawImage(part, centred, placed);
    else context.drawImage(part, placed, centred);
    placed += stacked ? part.height : part.width;
  }

  return own(context.canvas.transferToImageBitmap());
}

export function scaleBy(bitmap: ImageBitmap, factor: number): OwnedBitmap {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error(`A scale factor of ${factor} is not usable`);
  }

  const width = Math.max(1, Math.round(bitmap.width * factor));
  const height = Math.max(1, Math.round(bitmap.height * factor));
  const context = surfaceFor(width, height, false);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  return own(context.canvas.transferToImageBitmap());
}

export function toGrayscale(bitmap: ImageBitmap): OwnedBitmap {
  const context = surfaceFor(bitmap.width, bitmap.height, true);
  context.drawImage(bitmap, 0, 0);

  const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height);
  const data = pixels.data;
  for (let offset = 0; offset < data.length; offset += 4) {
    const grey = lumaAt(data, offset);
    data[offset] = grey;
    data[offset + 1] = grey;
    data[offset + 2] = grey;
  }
  context.putImageData(pixels, 0, 0);

  return own(context.canvas.transferToImageBitmap());
}
