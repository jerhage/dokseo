import type { Arrangement } from '$lib/shared/arrangement';
import { clampTo, imageRect, normalize } from '$lib/shared/geometry';
import type { ImageRect } from '$lib/shared/geometry';
import { own } from './bitmap';
import type { OwnedBitmap } from './bitmap';

const REC_601_RED_FIXED = 19595;

const REC_601_GREEN_FIXED = 38470;

const REC_601_BLUE_FIXED = 7471;

const FIXED_POINT_HALF = 0x8000;

const FIXED_POINT_SHIFT = 16;

const GROUND = '#ffffff';

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

function pillowLuma(red: number, green: number, blue: number): number {
  return (
    (red * REC_601_RED_FIXED +
      green * REC_601_GREEN_FIXED +
      blue * REC_601_BLUE_FIXED +
      FIXED_POINT_HALF) >>
    FIXED_POINT_SHIFT
  );
}

function lumaAt(data: Uint8ClampedArray, offset: number): number {
  return pillowLuma(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
}

function lumaPlane(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const luma = new Uint8ClampedArray(Math.floor(rgba.length / 4));
  for (let at = 0; at < luma.length; at += 1) luma[at] = lumaAt(rgba, at * 4);
  return luma;
}

async function cropFrom(bitmap: ImageBitmap, rect: ImageRect): Promise<OwnedBitmap> {
  const bounds = imageRect(0, 0, bitmap.width, bitmap.height);
  const area = wholePixels(clampTo(normalize(rect), bounds));
  if (!usable(area.width) || !usable(area.height)) {
    throw new Error(
      `A ${rect.width}x${rect.height} region at ${rect.x},${rect.y} covers no pixels of a ${bitmap.width}x${bitmap.height} image`,
    );
  }

  const cropped = await createImageBitmap(bitmap, area.x, area.y, area.width, area.height);
  return own(cropped);
}

function stitch(parts: readonly ImageBitmap[], arrangement: Arrangement): OwnedBitmap {
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

function scaleBy(bitmap: ImageBitmap, factor: number): OwnedBitmap {
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

function toGrayscale(bitmap: ImageBitmap): OwnedBitmap {
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

export { cropFrom, lumaPlane, pillowLuma, stitch, scaleBy, toGrayscale };
