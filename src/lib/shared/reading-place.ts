import type { ImageIndex } from './ids';

type ReadingPlace =
  | { readonly kind: 'image'; readonly index: ImageIndex }
  | { readonly kind: 'text'; readonly cfi: string };

function imagePlace(index: ImageIndex): ReadingPlace {
  return { kind: 'image', index };
}

function textPlace(cfi: string): ReadingPlace {
  return { kind: 'text', cfi };
}

export { imagePlace, textPlace };
export type { ReadingPlace };
