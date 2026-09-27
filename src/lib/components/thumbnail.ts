import { match } from 'ts-pattern';
import type { ClassList, MediaRatio } from './classes';

type ThumbnailSize = 'sm' | 'md' | 'lg' | 'fill';

type ThumbnailContent =
  | { readonly kind: 'image'; readonly src: string; readonly alt: string }
  | { readonly kind: 'named'; readonly label: string }
  | { readonly kind: 'blank' };

const THUMBNAIL_SIZES: Readonly<Record<ThumbnailSize, ClassList>> = {
  sm: ['thumbnail-sm'],
  md: ['thumbnail-md'],
  lg: ['thumbnail-lg'],
  fill: ['thumbnail-fill'],
};

const THUMBNAIL_RATIOS: Readonly<Record<MediaRatio, ClassList>> = {
  portrait: ['aspect-portrait'],
  square: ['aspect-square'],
  video: ['aspect-video'],
};

function thumbnailContent(src: string | null, alt: string): ThumbnailContent {
  if (src !== null) return { kind: 'image', src, alt };
  return alt === '' ? { kind: 'blank' } : { kind: 'named', label: alt };
}

function thumbnailRatio(size: ThumbnailSize, ratio: MediaRatio): ClassList {
  return match(size)
    .with('fill', () => [])
    .with('sm', 'md', 'lg', () => THUMBNAIL_RATIOS[ratio])
    .exhaustive();
}

export { THUMBNAIL_RATIOS, THUMBNAIL_SIZES, thumbnailContent, thumbnailRatio };
export type { ThumbnailContent, ThumbnailSize };
