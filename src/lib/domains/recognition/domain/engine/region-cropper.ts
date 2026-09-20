import type { Arrangement } from '$lib/shared/arrangement';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource } from '$lib/shared/page-source';
import type { Result } from '$lib/shared/result';

type CropError =
  | { readonly kind: 'nothing-selected' }
  | { readonly kind: 'unreadable'; readonly cause: string };

interface RegionCropper {
  crop(
    source: PageSource,
    regions: readonly ImageRegion[],
    arrangement: Arrangement,
  ): Promise<Result<ImageBitmap, CropError>>;
}

export type { CropError, RegionCropper };
