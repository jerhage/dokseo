import { normalize, screenRect, type ScreenRect } from '$lib/shared/geometry';

export type Point = { readonly x: number; readonly y: number };

export const MIN_SELECTION_PX = 12;

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function selectionFrom(from: Point, to: Point): ScreenRect {
  if (!isFinitePoint(from) || !isFinitePoint(to)) return screenRect(0, 0, 0, 0);

  return normalize(screenRect(from.x, from.y, to.x - from.x, to.y - from.y));
}

export function isUsableSelection(selection: ScreenRect): boolean {
  const rect = normalize(selection);
  return rect.width >= MIN_SELECTION_PX && rect.height >= MIN_SELECTION_PX;
}
