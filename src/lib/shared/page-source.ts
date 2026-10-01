import type { Size } from './geometry';
import type { ImageIndex } from './ids';

type PageSourceError =
  | { readonly kind: 'out-of-range'; readonly index: number; readonly count: number }
  | { readonly kind: 'page-unreadable'; readonly index: number; readonly cause: string }
  | { readonly kind: 'decode-failed'; readonly index: number; readonly cause: string }
  | { readonly kind: 'render-failed'; readonly index: number; readonly cause: string }
  | { readonly kind: 'source-unreadable'; readonly cause: string };

type PagePicture =
  | { readonly kind: 'encoded'; readonly url: string }
  | { readonly kind: 'drawn'; readonly bitmap: ImageBitmap };

type PictureRead = { readonly kind: 'success'; readonly picture: PagePicture } | PageSourceError;

type ImageRead = { readonly kind: 'success'; readonly image: ImageBitmap } | PageSourceError;

type SizesRead =
  | { readonly kind: 'success'; readonly sizes: readonly (Size | null)[] }
  | PageSourceError;

type PageNamesRead =
  | { readonly kind: 'success'; readonly names: readonly string[] }
  | PageSourceError;

interface PageSource {
  readonly count: number;
  picture(index: ImageIndex): Promise<PictureRead>;
  image(index: ImageIndex): Promise<ImageRead>;
  sizes(): Promise<SizesRead>;
  close(): void;
  [Symbol.dispose](): void;
}

type PageSourceOpening = { readonly kind: 'success'; readonly pages: PageSource } | PageSourceError;

export type {
  ImageRead,
  PageNamesRead,
  PagePicture,
  PageSource,
  PageSourceError,
  PageSourceOpening,
  PictureRead,
  SizesRead,
};
