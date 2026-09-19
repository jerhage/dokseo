import { own } from '$lib/platform/image/bitmap';
import type { Arrangement } from '$lib/shared/arrangement';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource } from '$lib/shared/page-source';
import { err, ok, type Result } from '$lib/shared/result';
import type { RecognizedText } from '../domain/recognized-text';
import type { CropError, RegionCropper } from '../domain/region-cropper';
import type { RecognitionError, TextRecognizer } from '../domain/text-recognizer';

export type RecognizeRegionDeps = {
  readonly cropper: RegionCropper;
  readonly recognizer: TextRecognizer;
};

export type RecognizeRegionError =
  | { readonly kind: 'crop'; readonly error: CropError }
  | { readonly kind: 'recognition'; readonly error: RecognitionError };

export async function recognizeRegion(
  deps: RecognizeRegionDeps,
  source: PageSource,
  regions: readonly ImageRegion[],
  arrangement: Arrangement,
): Promise<Result<RecognizedText, RecognizeRegionError>> {
  const cropped = await deps.cropper.crop(source, regions, arrangement);
  if (!cropped.ok) return err({ kind: 'crop', error: cropped.error });

  using crop = own(cropped.value);
  const recognized = await deps.recognizer.recognize(crop.bitmap);
  if (!recognized.ok) return err({ kind: 'recognition', error: recognized.error });

  return ok(recognized.value);
}
