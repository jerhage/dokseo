import type { Anchor } from '$lib/shared/anchor';
import type { CaptureId } from '$lib/shared/ids';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { inBookOrder } from './capture-order';
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
  wanted: CaptureId,
): Arrival<T> | null {
  const only = captures.find((capture) => capture.id === wanted);
  return only === undefined ? null : { at: only, stepping: null };
}

function arrivalAt<T extends ArrivalCapture>(
  captures: readonly T[],
  query: string | null,
  direction: ReadingDirection,
  wanted: CaptureId,
): Arrival<T> | null {
  if (query === null || query.trim().length === 0) return alone(captures, wanted);

  const found = matchesInBookOrder(captures, query, direction);
  const place = found.findIndex((capture) => capture.id === wanted);
  const here = found[place];
  if (here === undefined) return alone(captures, wanted);

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

export { matchesInBookOrder, arrivalAt };
export type { ArrivalCapture, Stepping, Arrival };
