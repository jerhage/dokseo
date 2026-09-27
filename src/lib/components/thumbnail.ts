import type { ClassList, ControlSize, MediaRatio } from './classes';

type ThumbnailContent =
  | { readonly kind: 'image'; readonly src: string; readonly alt: string }
  | { readonly kind: 'named'; readonly label: string }
  | { readonly kind: 'blank' };

const THUMBNAIL_SIZES: Readonly<Record<ControlSize, ClassList>> = {
  sm: ['thumbnail-sm'],
  md: [],
  lg: ['thumbnail-lg'],
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

function thumbnailFraming(fill: boolean, size: ControlSize, ratio: MediaRatio): ClassList {
  return fill ? ['thumbnail-fill'] : [...THUMBNAIL_SIZES[size], ...THUMBNAIL_RATIOS[ratio]];
}

export { THUMBNAIL_RATIOS, THUMBNAIL_SIZES, thumbnailContent, thumbnailFraming };
export type { ThumbnailContent };
