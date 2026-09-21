import type { ImageIndex } from './ids';
import type { Result } from './result';

type PageSourceError =
  | { readonly kind: 'out-of-range'; readonly index: number; readonly count: number }
  | { readonly kind: 'page-unreadable'; readonly index: number; readonly cause: string }
  | { readonly kind: 'decode-failed'; readonly index: number; readonly cause: string }
  | { readonly kind: 'render-failed'; readonly index: number; readonly cause: string }
  | { readonly kind: 'source-unreadable'; readonly cause: string };

type PagePicture =
  | { readonly kind: 'encoded'; readonly url: string }
  | { readonly kind: 'drawn'; readonly bitmap: ImageBitmap };

interface PageSource {
  readonly count: number;
  picture(index: ImageIndex): Promise<Result<PagePicture, PageSourceError>>;
  image(index: ImageIndex): Promise<Result<ImageBitmap, PageSourceError>>;
  close(): void;
  [Symbol.dispose](): void;
}

export type { PageSourceError, PagePicture, PageSource };
