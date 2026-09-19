import type { Size } from '$lib/shared/geometry';
import { imageIndex, type ImageIndex } from '$lib/shared/ids';
import { readingPosition, type ReadingPosition } from './reading-position';

export type SliceLayout = {
  readonly index: ImageIndex;
  readonly top: number;
  readonly height: number;
  readonly measured: boolean;
};

export type VisibleRange = { readonly first: number; readonly last: number };

export type PlacedSlice = { readonly index: ImageIndex; readonly height: number };

export type StripSpacers = {
  readonly before: number;
  readonly slices: readonly PlacedSlice[];
  readonly after: number;
};

export const ASSUMED_ASPECT = 1.5;

export const OVERSCAN_SCREENS = 0.5;

const NOTHING_VISIBLE: VisibleRange = { first: 0, last: -1 };

function positiveOrZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function aspectOf(size: Size | null | undefined): number | null {
  if (!size) return null;
  if (positiveOrZero(size.width) === 0 || positiveOrZero(size.height) === 0) return null;
  return size.height / size.width;
}

export function layOutStrip(
  sizes: readonly (Size | null)[],
  width: number,
): readonly SliceLayout[] {
  const displayWidth = positiveOrZero(width);
  const layout: SliceLayout[] = [];
  let top = 0;

  for (let index = 0; index < sizes.length; index += 1) {
    const aspect = aspectOf(sizes[index]);
    const height = displayWidth * (aspect ?? ASSUMED_ASPECT);

    layout.push({ index: imageIndex(index), top, height, measured: aspect !== null });
    top += height;
  }

  return layout;
}

export function stripHeight(layout: readonly SliceLayout[]): number {
  const last = layout[layout.length - 1];
  return last === undefined ? 0 : last.top + last.height;
}

export function visibleRange(
  layout: readonly SliceLayout[],
  scrollTop: number,
  viewportHeight: number,
  overscan: number,
): VisibleRange {
  const start = Number.isFinite(scrollTop) ? scrollTop : 0;
  const margin = positiveOrZero(overscan);
  const top = start - margin;
  const bottom = start + positiveOrZero(viewportHeight) + margin;

  let first = -1;
  let last = -1;

  for (let index = 0; index < layout.length; index += 1) {
    const slice = layout[index];
    if (slice === undefined) break;
    if (slice.top > bottom) break;
    if (slice.top + slice.height >= top) {
      if (first === -1) first = index;
      last = index;
    }
  }

  return first === -1 ? NOTHING_VISIBLE : { first, last };
}

export function stripOverscan(viewportHeight: number): number {
  return positiveOrZero(viewportHeight) * OVERSCAN_SCREENS;
}

export function spacersFor(
  layout: readonly SliceLayout[],
  range: VisibleRange,
  snap: (value: number) => number,
): StripSpacers {
  const total = stripHeight(layout);
  const opening = layout[range.first];
  if (opening === undefined || range.last < range.first) {
    return { before: 0, slices: [], after: positiveOrZero(total) };
  }

  const before = positiveOrZero(snap(opening.top));
  const slices: PlacedSlice[] = [];
  let edge = before;

  for (let index = range.first; index <= range.last; index += 1) {
    const slice = layout[index];
    if (slice === undefined) break;

    const bottom = positiveOrZero(snap(slice.top + slice.height));
    slices.push({ index: slice.index, height: positiveOrZero(bottom - edge) });
    edge = bottom;
  }

  return { before, slices, after: positiveOrZero(total - edge) };
}

export function positionAtScroll(
  layout: readonly SliceLayout[],
  scrollTop: number,
): ReadingPosition | null {
  const first = layout[0];
  const last = layout[layout.length - 1];
  if (first === undefined || last === undefined) return null;

  const offset = Number.isFinite(scrollTop) ? scrollTop : 0;
  if (offset <= first.top) return readingPosition(first.index, 0);
  if (offset >= last.top + last.height) return readingPosition(last.index, 1);

  const reached = layout.find((slice) => offset < slice.top + slice.height) ?? last;
  const fraction = reached.height > 0 ? (offset - reached.top) / reached.height : 0;

  return readingPosition(reached.index, fraction);
}

export function scrollForPosition(
  layout: readonly SliceLayout[],
  position: ReadingPosition,
): number {
  const slice = layout.find((candidate) => candidate.index === position.index);
  if (slice === undefined) return 0;

  return slice.top + slice.height * readingPosition(position.index, position.offset).offset;
}
