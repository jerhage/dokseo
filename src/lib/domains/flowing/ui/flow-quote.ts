import { match } from 'ts-pattern';
import type { TextQuote } from '$lib/shared/anchor';

type QuoteHit = {
  readonly start: number;
  readonly end: number;
};

type QuotePoint = {
  readonly part: number;
  readonly offset: number;
};

type PassageArrival =
  | { readonly kind: 'cfi' }
  | { readonly kind: 'quote' }
  | { readonly kind: 'lost' };

const ARRIVED_AT_THE_CFI: PassageArrival = { kind: 'cfi' };

const FOUND_BY_ITS_TEXT: PassageArrival = { kind: 'quote' };

const THE_PASSAGE_IS_LOST: PassageArrival = { kind: 'lost' };

const MOVED_SINCE_IT_WAS_CAPTURED =
  'This passage moved since it was captured, so it was found by its text.';

const NOT_IN_THE_BOOK_ANY_MORE = 'This passage is no longer anywhere in this book.';

function commonPrefix(left: string, right: string): number {
  const shortest = Math.min(left.length, right.length);
  let same = 0;
  while (same < shortest && left[same] === right[same]) same += 1;

  return same;
}

function commonSuffix(left: string, right: string): number {
  const shortest = Math.min(left.length, right.length);
  let same = 0;
  while (same < shortest && left[left.length - 1 - same] === right[right.length - 1 - same]) {
    same += 1;
  }

  return same;
}

function contextScore(text: string, quote: TextQuote, at: number): number {
  const before = commonSuffix(text.slice(0, at), quote.prefix);
  const after = commonPrefix(text.slice(at + quote.exact.length), quote.suffix);

  return before + after;
}

function locateQuote(text: string, quote: TextQuote): QuoteHit | null {
  const exact = quote.exact;
  if (exact.length === 0) return null;

  let best: QuoteHit | null = null;
  let bestScore = -1;

  for (let at = text.indexOf(exact); at !== -1; at = text.indexOf(exact, at + 1)) {
    const score = contextScore(text, quote, at);
    if (score > bestScore) {
      bestScore = score;
      best = { start: at, end: at + exact.length };
    }
  }

  return best;
}

function pointIn(lengths: readonly number[], offset: number): QuotePoint | null {
  if (offset < 0) return null;

  let seen = 0;
  for (const [part, length] of lengths.entries()) {
    if (offset <= seen + length) return { part, offset: offset - seen };

    seen += length;
  }

  return null;
}

function passageNotice(arrival: PassageArrival): string | null {
  return match(arrival)
    .with({ kind: 'cfi' }, () => null)
    .with({ kind: 'quote' }, () => MOVED_SINCE_IT_WAS_CAPTURED)
    .with({ kind: 'lost' }, () => NOT_IN_THE_BOOK_ANY_MORE)
    .exhaustive();
}

export {
  ARRIVED_AT_THE_CFI,
  FOUND_BY_ITS_TEXT,
  MOVED_SINCE_IT_WAS_CAPTURED,
  NOT_IN_THE_BOOK_ANY_MORE,
  THE_PASSAGE_IS_LOST,
  commonPrefix,
  commonSuffix,
  locateQuote,
  passageNotice,
  pointIn,
};
export type { PassageArrival, QuoteHit, QuotePoint };
