import type { BookId } from '$lib/shared/ids';
import { captureHref } from '$lib/shared/reader-location';
import { firstRegion } from '../../domain/capture/capture-arrival';
import type { ArrivalCapture, Stepping } from '../../domain/capture/capture-arrival';
import { matchOfTotal } from '../../domain/capture/match-stepping';

type ArrivalSteps = {
  readonly count: string;
  readonly previous: string | null;
  readonly next: string | null;
};

function stepHref(book: BookId, query: string, capture: ArrivalCapture): string | null {
  const region = firstRegion(capture.anchor);
  return region === null ? null : captureHref(book, region, query);
}

function arrivalSteps(
  book: BookId,
  query: string,
  stepping: Stepping<ArrivalCapture>,
): ArrivalSteps {
  return {
    count: matchOfTotal(stepping.ordinal - 1, stepping.total),
    previous: stepHref(book, query, stepping.previous),
    next: stepHref(book, query, stepping.next),
  };
}

export { arrivalSteps };
export type { ArrivalSteps };
