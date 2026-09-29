import { imageIndex } from './ids';
import type { ImageIndex } from './ids';

type ImagePlace = {
  readonly kind: 'image';
  readonly index: ImageIndex;
  readonly shownThrough: ImageIndex;
  readonly offset: number;
};

type TextPlace = { readonly kind: 'text'; readonly cfi: string; readonly fraction: number | null };

type ReadingPlace = ImagePlace | TextPlace;

const WHEREVER_THE_BOOK_STARTS = '';

const TOP_OF_THE_IMAGE = 0;

const BOTTOM_OF_THE_IMAGE = 1;

const NO_FRACTION_REPORTED = null;

const THE_END_OF_THE_TEXT = 1;

const ROUNDING_SHORT_OF_THE_END = 1e-9;

function withinTheImage(offset: number): number {
  if (!Number.isFinite(offset)) return TOP_OF_THE_IMAGE;

  return Math.min(BOTTOM_OF_THE_IMAGE, Math.max(TOP_OF_THE_IMAGE, offset));
}

function imagePlace(
  index: ImageIndex,
  shownThrough: ImageIndex = index,
  offset: number = TOP_OF_THE_IMAGE,
): ImagePlace {
  return {
    kind: 'image',
    index,
    shownThrough: imageIndex(Math.max(index, shownThrough)),
    offset: withinTheImage(offset),
  };
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
      other.kind === 'image' &&
      one.index === other.index &&
      one.shownThrough === other.shownThrough &&
      one.offset === other.offset
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

function readingStarted(
  place: ReadingPlace,
  imageCount: number,
  lastReadAt: number | null,
): boolean {
  if (place.kind === 'text') return resumedCfi(place) !== null;

  return place.index !== 0 || (lastReadAt !== null && showsTheEnd(place, imageCount));
}

export {
  imagePlace,
  NO_FRACTION_REPORTED,
  readingStarted,
  resumedCfi,
  samePlace,
  showsTheEnd,
  START_OF_THE_TEXT,
  textPlace,
  TOP_OF_THE_IMAGE,
};
export type { ImagePlace, ReadingPlace };
