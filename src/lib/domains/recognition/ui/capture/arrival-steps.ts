import type { BookId } from '$lib/shared/ids';
import { readerHref } from '$lib/shared/reader-location';
import type { Stepping } from '../../domain/capture/capture-arrival';
import { matchOfTotal } from '../../domain/capture/match-stepping';

type ArrivalSteps = {
  readonly count: string;
  readonly previous: string | null;
  readonly next: string | null;
};

function arrivalSteps(book: BookId, query: string, stepping: Stepping): ArrivalSteps {
  return {
    count: matchOfTotal(stepping.ordinal - 1, stepping.total),
    previous: readerHref(book, stepping.previous, query),
    next: readerHref(book, stepping.next, query),
  };
}

export { arrivalSteps };
export type { ArrivalSteps };
