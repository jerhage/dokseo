import type { ImageIndex } from './ids';

type ReadingPlace =
  | { readonly kind: 'image'; readonly index: ImageIndex }
  | { readonly kind: 'text'; readonly cfi: string; readonly fraction: number | null };

const WHEREVER_THE_BOOK_STARTS = '';

const NO_FRACTION_REPORTED = null;

function imagePlace(index: ImageIndex): ReadingPlace {
  return { kind: 'image', index };
}

function withinTheBook(fraction: number | null): number | null {
  if (fraction === null || !Number.isFinite(fraction)) return NO_FRACTION_REPORTED;

  return Math.min(1, Math.max(0, fraction));
}

function textPlace(cfi: string, fraction: number | null): ReadingPlace {
  return { kind: 'text', cfi, fraction: withinTheBook(fraction) };
}

const START_OF_THE_TEXT: ReadingPlace = textPlace(WHEREVER_THE_BOOK_STARTS, NO_FRACTION_REPORTED);

function resumedCfi(place: ReadingPlace): string | null {
  if (place.kind !== 'text') return null;
  return place.cfi === WHEREVER_THE_BOOK_STARTS ? null : place.cfi;
}

function samePlace(one: ReadingPlace, other: ReadingPlace): boolean {
  if (one.kind === 'image') return other.kind === 'image' && one.index === other.index;

  return other.kind === 'text' && one.cfi === other.cfi && one.fraction === other.fraction;
}

export { imagePlace, NO_FRACTION_REPORTED, resumedCfi, samePlace, START_OF_THE_TEXT, textPlace };
export type { ReadingPlace };
