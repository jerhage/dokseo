import { spaceFigure } from './storage-figures';

type PixelSize = { readonly width: number; readonly height: number };

type CanvasAreaFit =
  | { readonly kind: 'fits-both' }
  | { readonly kind: 'fits-current-only' }
  | { readonly kind: 'fits-neither' };

const BYTES_PER_PIXEL = 4;

const IOS_CANVAS_AREA = 8192 * 8192;

const IOS_CANVAS_AREA_BEFORE_18 = 4096 * 4096;

const WHOLE_MILLISECONDS = 10;

function decodedBytes(size: PixelSize): number {
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height)) return 0;
  return Math.max(0, size.width) * Math.max(0, size.height) * BYTES_PER_PIXEL;
}

function decodedFigure(size: PixelSize): string {
  return spaceFigure(decodedBytes(size));
}

function pixelCount(size: PixelSize): number {
  return Math.max(0, size.width) * Math.max(0, size.height);
}

function iosCanvasFit(size: PixelSize): CanvasAreaFit {
  const area = pixelCount(size);
  if (area <= IOS_CANVAS_AREA_BEFORE_18) return { kind: 'fits-both' };
  if (area <= IOS_CANVAS_AREA) return { kind: 'fits-current-only' };
  return { kind: 'fits-neither' };
}

function durationText(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return 'not measured';
  if (milliseconds >= WHOLE_MILLISECONDS) return `${Math.round(milliseconds)} ms`;
  return `${milliseconds.toFixed(1)} ms`;
}

function sizeFigure(size: PixelSize): string {
  return `${size.width} × ${size.height}`;
}

export {
  BYTES_PER_PIXEL,
  IOS_CANVAS_AREA,
  IOS_CANVAS_AREA_BEFORE_18,
  decodedBytes,
  decodedFigure,
  durationText,
  iosCanvasFit,
  pixelCount,
  sizeFigure,
};
export type { CanvasAreaFit, PixelSize };
