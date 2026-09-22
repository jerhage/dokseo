import type { ImageIndex } from './ids';

type ReadingPlace =
  | { readonly kind: 'image'; readonly index: ImageIndex }
  | { readonly kind: 'text'; readonly cfi: string };

const WHEREVER_THE_BOOK_STARTS = '';

function imagePlace(index: ImageIndex): ReadingPlace {
  return { kind: 'image', index };
}

function textPlace(cfi: string): ReadingPlace {
  return { kind: 'text', cfi };
}

const START_OF_THE_TEXT: ReadingPlace = textPlace(WHEREVER_THE_BOOK_STARTS);

function resumedCfi(place: ReadingPlace): string | null {
  if (place.kind !== 'text') return null;
  return place.cfi === WHEREVER_THE_BOOK_STARTS ? null : place.cfi;
}

export { imagePlace, resumedCfi, START_OF_THE_TEXT, textPlace };
export type { ReadingPlace };
