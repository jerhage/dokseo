import type { Anchor, SoughtPassage } from '$lib/shared/anchor';
import type { CaptureId, ImageIndex } from '$lib/shared/ids';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { inBookOrder } from './capture-order';
import { captureHolds } from './capture-results';
import type { SearchedCapture } from './capture-results';
import { wrappedIndex } from './match-stepping';

type ArrivalCapture = SearchedCapture & {
  readonly id: CaptureId;
  readonly anchor: Anchor;
};

type Stepping = {
  readonly ordinal: number;
  readonly total: number;
  readonly previous: ImageIndex;
  readonly next: ImageIndex;
};

type Arrival<T> = {
  readonly at: readonly T[];
  readonly stepping: Stepping | null;
};

type Stop<T> = {
  readonly index: ImageIndex;
  readonly captures: readonly T[];
};

function startingImage(anchor: Anchor): ImageIndex | null {
  if (anchor.kind === 'text') return null;

  return anchor.regions[0]?.index ?? null;
}

function matchesInBookOrder<T extends ArrivalCapture>(
  captures: readonly T[],
  query: string,
  direction: ReadingDirection,
): readonly T[] {
  return inBookOrder(
    captures.filter((capture) => captureHolds(capture, query)),
    direction,
  );
}

function stopsOf<T extends ArrivalCapture>(ordered: readonly T[]): readonly Stop<T>[] {
  const stops: Stop<T>[] = [];
  for (const capture of ordered) {
    const index = startingImage(capture.anchor);
    if (index === null) continue;

    const last = stops.at(-1);
    if (last !== undefined && last.index === index) {
      stops[stops.length - 1] = { index, captures: [...last.captures, capture] };
      continue;
    }

    stops.push({ index, captures: [capture] });
  }

  return stops;
}

function onImage<T extends ArrivalCapture>(
  captures: readonly T[],
  direction: ReadingDirection,
  index: ImageIndex,
): Arrival<T> | null {
  const here = inBookOrder(
    captures.filter((capture) => startingImage(capture.anchor) === index),
    direction,
  );
  return here.length === 0 ? null : { at: here, stepping: null };
}

function arrivalAt<T extends ArrivalCapture>(
  captures: readonly T[],
  query: string | null,
  direction: ReadingDirection,
  index: ImageIndex,
): Arrival<T> | null {
  if (query === null || query.trim().length === 0) return onImage(captures, direction, index);

  const stops = stopsOf(matchesInBookOrder(captures, query, direction));
  const place = stops.findIndex((stop) => stop.index === index);
  const here = stops[place];
  if (here === undefined) return onImage(captures, direction, index);

  const before = stops[wrappedIndex(place, -1, stops.length)];
  const after = stops[wrappedIndex(place, 1, stops.length)];
  if (before === undefined || after === undefined) return null;

  return {
    at: here.captures,
    stepping: {
      ordinal: place + 1,
      total: stops.length,
      previous: before.index,
      next: after.index,
    },
  };
}

function soughtPassage(anchors: readonly Anchor[], cfi: string): SoughtPassage {
  const held = anchors.find((anchor) => anchor.kind === 'text' && anchor.cfi === cfi);
  return { cfi, quote: held?.kind === 'text' ? held.quote : null };
}

export { matchesInBookOrder, arrivalAt, soughtPassage };
export type { ArrivalCapture, Stepping, Arrival };
