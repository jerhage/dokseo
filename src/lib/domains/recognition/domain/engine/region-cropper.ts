import type { Arrangement } from '$lib/shared/arrangement';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource } from '$lib/shared/page-source';

type CropError =
  | { readonly kind: 'nothing-selected' }
  | { readonly kind: 'unreadable'; readonly cause: string };

type Cropping = { readonly kind: 'success'; readonly crop: ImageBitmap } | CropError;

interface RegionCropper {
  crop(
    source: PageSource,
    regions: readonly ImageRegion[],
    arrangement: Arrangement,
  ): Promise<Cropping>;
}

export type { CropError, Cropping, RegionCropper };
