import { toImageRect, toPageFraction } from '$lib/domains/viewing/domain/placement';
import type { PageFraction } from '$lib/domains/viewing/domain/placement';
import { pageRectOf, screenRect } from '$lib/shared/geometry';
import type { ImageRect, ScreenRect, Size } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';

type CapturePreset = 'title' | 'bubble' | 'caption';

type PointRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type ScaledCapture = {
  readonly scale: number;
  readonly natural: Size;
  readonly rect: ImageRect;
  readonly box: PageFraction;
};

const SAMPLE_PAGE_POINTS: Size = { width: 360, height: 504 };

const CAPTURE_PRESETS: Readonly<Record<CapturePreset, PointRect>> = {
  title: { x: 30, y: 30, width: 120, height: 40 },
  bubble: { x: 196, y: 40, width: 130, height: 92 },
  caption: { x: 30, y: 286, width: 140, height: 40 },
};

function renderedSize(scale: number): Size {
  return {
    width: Math.ceil(SAMPLE_PAGE_POINTS.width * scale),
    height: Math.ceil(SAMPLE_PAGE_POINTS.height * scale),
  };
}

function selectionOver(display: ScreenRect, area: PointRect): ScreenRect {
  const across = display.width / SAMPLE_PAGE_POINTS.width;
  const down = display.height / SAMPLE_PAGE_POINTS.height;
  return screenRect(
    display.x + area.x * across,
    display.y + area.y * down,
    area.width * across,
    area.height * down,
  );
}

function captureAt(
  display: ScreenRect,
  selection: ScreenRect,
  scale: number,
): ScaledCapture | null {
  const natural = renderedSize(scale);
  const rect = toImageRect({ index: imageIndex(0), onScreen: display, natural }, selection);
  if (rect === null) return null;
  const stored = pageRectOf(rect, natural);
  const box = stored === null ? null : toPageFraction(stored);
  if (box === null) return null;
  return { scale, natural, rect, box };
}

function readAgainstScale(rect: ImageRect, scale: number): PageFraction | null {
  const misread = pageRectOf(rect, renderedSize(scale));
  return misread === null ? null : toPageFraction(misread);
}

function devicePixelsPerPagePixel(cssWidth: number, ratio: number, naturalWidth: number): number {
  if (naturalWidth <= 0 || !Number.isFinite(ratio)) return 0;
  return (cssWidth * ratio) / naturalWidth;
}

function rectFigure(rect: ImageRect): string {
  const whole = (value: number): number => Math.round(value);
  return `x ${whole(rect.x)}, y ${whole(rect.y)}, ${whole(rect.width)} × ${whole(rect.height)}`;
}

export {
  CAPTURE_PRESETS,
  SAMPLE_PAGE_POINTS,
  captureAt,
  devicePixelsPerPagePixel,
  readAgainstScale,
  rectFigure,
  renderedSize,
  selectionOver,
};
export type { CapturePreset, PointRect, ScaledCapture };
