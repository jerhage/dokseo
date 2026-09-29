import type { Anchor, SoughtPassage, TextAnchor } from '$lib/shared/anchor';
import type { CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { REGION_TOLERANCE, regionDistance } from '$lib/shared/reader-location';
import { inBookOrder, inPassageOrder } from './capture-order';
import type { PassageOrder } from './capture-order';
import { captureHolds } from './capture-results';
import type { SearchedCapture } from './capture-results';
import { wrappedIndex } from './match-stepping';

type ArrivalCapture = SearchedCapture & {
  readonly id: CaptureId;
  readonly anchor: Anchor;
};

type Stepping<T> = {
  readonly ordinal: number;
  readonly total: number;
  readonly previous: T;
  readonly next: T;
};

type Arrival<T> = {
  readonly at: T;
  readonly stepping: Stepping<T> | null;
};

function firstRegion(anchor: Anchor): ImageRegion | null {
  if (anchor.kind === 'text') return null;

  return anchor.regions[0] ?? null;
}

function distanceFrom(capture: ArrivalCapture, named: ImageRegion): number | null {
  const region = firstRegion(capture.anchor);
  if (region === null || region.index !== named.index) return null;

  const distance = regionDistance(named.rect, region.rect);
  return distance <= REGION_TOLERANCE ? distance : null;
}

function placeOf<T extends ArrivalCapture>(ordered: readonly T[], named: ImageRegion): number {
  let place = -1;
  let closest = Number.POSITIVE_INFINITY;
  ordered.forEach((capture, index) => {
    const distance = distanceFrom(capture, named);
    if (distance === null || distance >= closest) return;

    place = index;
    closest = distance;
  });

  return place;
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

function alone<T extends ArrivalCapture>(
  captures: readonly T[],
  direction: ReadingDirection,
  named: ImageRegion,
): Arrival<T> | null {
  const ordered = inBookOrder(captures, direction);
  const only = ordered[placeOf(ordered, named)];
  return only === undefined ? null : { at: only, stepping: null };
}

function arrivalAt<T extends ArrivalCapture>(
  captures: readonly T[],
  query: string | null,
  direction: ReadingDirection,
  named: ImageRegion,
): Arrival<T> | null {
  if (query === null || query.trim().length === 0) return alone(captures, direction, named);

  const found = matchesInBookOrder(captures, query, direction);
  const place = placeOf(found, named);
  const here = found[place];
  if (here === undefined) return alone(captures, direction, named);

  return arrivalAmong(found, place, here);
}

function arrivalAmong<T>(found: readonly T[], place: number, here: T): Arrival<T> | null {
  const before = found[wrappedIndex(place, -1, found.length)];
  const after = found[wrappedIndex(place, 1, found.length)];
  if (before === undefined || after === undefined) return null;

  return {
    at: here,
    stepping: {
      ordinal: place + 1,
      total: found.length,
      previous: before,
      next: after,
    },
  };
}

function hasPassage<T extends ArrivalCapture>(
  capture: T,
): capture is T & { readonly anchor: TextAnchor } {
  return capture.anchor.kind === 'text' && capture.anchor.cfi.length > 0;
}

function passagesInBookOrder<T extends ArrivalCapture>(
  captures: readonly T[],
  order: PassageOrder,
): readonly (T & { readonly anchor: TextAnchor })[] {
  return inPassageOrder(captures.filter(hasPassage), order);
}

function passageAlone<T extends ArrivalCapture>(
  passages: readonly (T & { readonly anchor: TextAnchor })[],
  cfi: string,
): Arrival<T> | null {
  const only = passages.find((capture) => capture.anchor.cfi === cfi);
  return only === undefined ? null : { at: only, stepping: null };
}

function passageArrivalAt<T extends ArrivalCapture>(
  captures: readonly T[],
  query: string | null,
  cfi: string,
  order: PassageOrder,
): Arrival<T> | null {
  const passages = passagesInBookOrder(captures, order);
  if (query === null || query.trim().length === 0) return passageAlone(passages, cfi);

  const found = passages.filter((capture) => captureHolds(capture, query));
  const place = found.findIndex((capture) => capture.anchor.cfi === cfi);
  const here = found[place];
  if (here === undefined) return passageAlone(passages, cfi);

  return arrivalAmong<T>(found, place, here);
}

function soughtPassage(anchors: readonly Anchor[], cfi: string): SoughtPassage {
  const held = anchors.find((anchor) => anchor.kind === 'text' && anchor.cfi === cfi);
  return { cfi, quote: held?.kind === 'text' ? held.quote : null };
}

export { firstRegion, matchesInBookOrder, arrivalAt, passageArrivalAt, soughtPassage };
export type { ArrivalCapture, Stepping, Arrival };
