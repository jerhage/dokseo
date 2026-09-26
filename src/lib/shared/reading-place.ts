import { imageIndex } from './ids';
import type { ImageIndex } from './ids';

type ImagePlace = {
  readonly kind: 'image';
  readonly index: ImageIndex;
  readonly shownThrough: ImageIndex;
};

type TextPlace = { readonly kind: 'text'; readonly cfi: string; readonly fraction: number | null };

type ReadingPlace = ImagePlace | TextPlace;

const WHEREVER_THE_BOOK_STARTS = '';

const NO_FRACTION_REPORTED = null;

const THE_END_OF_THE_TEXT = 1;

const ROUNDING_SHORT_OF_THE_END = 1e-9;

function imagePlace(index: ImageIndex, shownThrough: ImageIndex = index): ImagePlace {
  return { kind: 'image', index, shownThrough: imageIndex(Math.max(index, shownThrough)) };
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
  if (one.kind === 'image') {
    return (
      other.kind === 'image' && one.index === other.index && one.shownThrough === other.shownThrough
    );
  }

  return other.kind === 'text' && one.cfi === other.cfi && one.fraction === other.fraction;
}

function showsTheEnd(place: ReadingPlace, imageCount: number): boolean {
  if (place.kind === 'image') return place.shownThrough >= imageCount - 1;

  return (
    place.fraction !== null && place.fraction >= THE_END_OF_THE_TEXT - ROUNDING_SHORT_OF_THE_END
  );
}

export {
  imagePlace,
  NO_FRACTION_REPORTED,
  resumedCfi,
  samePlace,
  showsTheEnd,
  START_OF_THE_TEXT,
  textPlace,
};
export type { ImagePlace, ReadingPlace };
