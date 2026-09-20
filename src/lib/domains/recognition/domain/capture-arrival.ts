import type { CaptureId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { ReadingDirection } from '$lib/shared/layout-kind';
import { matchesQuery } from '$lib/shared/text-search';
import { inBookOrder } from './capture-order';
import { wrappedIndex } from './match-stepping';

export type ArrivalCapture = {
  readonly id: CaptureId;
  readonly regions: readonly ImageRegion[];
  readonly text: string;
};

export type Stepping<T> = {
  readonly ordinal: number;
  readonly total: number;
  readonly previous: T;
  readonly next: T;
};

export type Arrival<T> = {
  readonly at: T;
  readonly stepping: Stepping<T> | null;
};

export function matchesInBookOrder<T extends ArrivalCapture>(
  captures: readonly T[],
  query: string,
  direction: ReadingDirection,
): readonly T[] {
  return inBookOrder(
    captures.filter((capture) => matchesQuery(capture.text, query)),
    direction,
  );
}

export function arrivalAt<T extends ArrivalCapture>(
  captures: readonly T[],
  query: string | null,
  direction: ReadingDirection,
  wanted: CaptureId,
): Arrival<T> | null {
  if (query === null || query.trim().length === 0) {
    const only = captures.find((capture) => capture.id === wanted);
    return only === undefined ? null : { at: only, stepping: null };
  }

  const found = matchesInBookOrder(captures, query, direction);
  const place = found.findIndex((capture) => capture.id === wanted);
  const here = found[place];
  if (here === undefined) return null;

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
