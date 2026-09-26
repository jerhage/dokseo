import type { Size } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageIndex } from '$lib/shared/ids';
import { readingPosition } from './reading-position';
import type { ReadingPosition } from './reading-position';

type SliceLayout = {
  readonly index: ImageIndex;
  readonly top: number;
  readonly height: number;
  readonly measured: boolean;
};

type VisibleRange = { readonly first: number; readonly last: number };

type PlacedSlice = { readonly index: ImageIndex; readonly height: number };

type Travel = 'down' | 'up';

type StripAnchor = {
  readonly index: ImageIndex;
  readonly edge: number;
  readonly width: number;
};

type Relayout =
  | { readonly kind: 'place' }
  | { readonly kind: 'follow' }
  | { readonly kind: 'stay' };

type StripSpacers = {
  readonly before: number;
  readonly slices: readonly PlacedSlice[];
  readonly after: number;
};

const ASSUMED_ASPECT = 1.5;

const AHEAD_SCREENS = 3;

const BEHIND_SCREENS = 1;

const MOST_SLICES = 8;

const ANCHOR_SLACK_PX = 0.5;

const NOTHING_VISIBLE: VisibleRange = { first: 0, last: -1 };

const EDGE_SLACK_PX = 1;

function positiveOrZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function aspectOf(size: Size | null | undefined): number | null {
  if (!size) return null;
  if (positiveOrZero(size.width) === 0 || positiveOrZero(size.height) === 0) return null;
  return size.height / size.width;
}

function layOutStrip(sizes: readonly (Size | null)[], width: number): readonly SliceLayout[] {
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

function stripHeight(layout: readonly SliceLayout[]): number {
  const last = layout[layout.length - 1];
  return last === undefined ? 0 : last.top + last.height;
}

function rangeBetween(layout: readonly SliceLayout[], top: number, bottom: number): VisibleRange {
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

function visibleRange(
  layout: readonly SliceLayout[],
  scrollTop: number,
  viewportHeight: number,
  overscan: number,
): VisibleRange {
  const start = Number.isFinite(scrollTop) ? scrollTop : 0;
  const margin = positiveOrZero(overscan);

  return rangeBetween(layout, start - margin, start + positiveOrZero(viewportHeight) + margin);
}

function travelBetween(from: number, to: number, was: Travel): Travel {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to === from) return was;
  return to > from ? 'down' : 'up';
}

function stripWindow(
  layout: readonly SliceLayout[],
  scrollTop: number,
  viewportHeight: number,
  travel: Travel,
): VisibleRange {
  if (positiveOrZero(viewportHeight) === 0 || stripHeight(layout) === 0) return NOTHING_VISIBLE;

  const shown = visibleRange(layout, scrollTop, viewportHeight, 0);
  if (shown.last < shown.first) return shown;

  const start = Number.isFinite(scrollTop) ? scrollTop : 0;
  const screen = positiveOrZero(viewportHeight);
  const ahead = screen * AHEAD_SCREENS;
  const behind = screen * BEHIND_SCREENS;
  const reach =
    travel === 'down'
      ? rangeBetween(layout, start - behind, start + screen + ahead)
      : rangeBetween(layout, start - ahead, start + screen + behind);

  const spare = Math.max(0, MOST_SLICES - (shown.last - shown.first + 1));
  const above = shown.first - reach.first;
  const below = reach.last - shown.last;
  const forward = Math.min(travel === 'down' ? below : above, spare);
  const backward = Math.min(travel === 'down' ? above : below, spare - forward);

  return travel === 'down'
    ? { first: shown.first - backward, last: shown.last + forward }
    : { first: shown.first - forward, last: shown.last + backward };
}

function spacersFor(
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

function positionAtScroll(
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

function shownThroughAtScroll(
  layout: readonly SliceLayout[],
  scrollTop: number,
  viewportHeight: number,
): ImageIndex | null {
  const reached = positionAtScroll(layout, scrollTop);
  if (reached === null) return null;

  const top = Number.isFinite(scrollTop) ? scrollTop : 0;
  const bottom = top + positiveOrZero(viewportHeight) + EDGE_SLACK_PX;
  let through = reached.index;

  for (const slice of layout) {
    if (slice.top + slice.height > bottom) break;
    if (slice.index > through) through = slice.index;
  }

  return through;
}

function anchorOf(
  layout: readonly SliceLayout[],
  width: number,
  index: ImageIndex,
): StripAnchor | null {
  const slice = layout.find((candidate) => candidate.index === index);
  return slice === undefined ? null : { index, edge: slice.top, width };
}

function relayoutFor(
  layout: readonly SliceLayout[],
  width: number,
  anchor: StripAnchor | null,
): Relayout {
  if (anchor === null) return { kind: 'place' };

  const now = anchorOf(layout, width, anchor.index);
  if (now === null || now.width !== anchor.width) return { kind: 'follow' };
  if (Math.abs(now.edge - anchor.edge) >= ANCHOR_SLACK_PX) return { kind: 'follow' };

  return { kind: 'stay' };
}

function scrollForPosition(layout: readonly SliceLayout[], position: ReadingPosition): number {
  const slice = layout.find((candidate) => candidate.index === position.index);
  if (slice === undefined) return 0;

  return slice.top + slice.height * readingPosition(position.index, position.offset).offset;
}

export {
  ASSUMED_ASPECT,
  AHEAD_SCREENS,
  BEHIND_SCREENS,
  MOST_SLICES,
  layOutStrip,
  stripHeight,
  visibleRange,
  travelBetween,
  stripWindow,
  spacersFor,
  positionAtScroll,
  shownThroughAtScroll,
  anchorOf,
  relayoutFor,
  scrollForPosition,
};
export type { SliceLayout, VisibleRange, PlacedSlice, StripSpacers, Travel, StripAnchor, Relayout };
