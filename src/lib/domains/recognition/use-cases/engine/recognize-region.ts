import { own } from '$lib/platform/image/bitmap';
import { noTrace, type TraceFactory } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource } from '$lib/shared/page-source';
import { err, ok, type Result } from '$lib/shared/result';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { CropError, RegionCropper } from '../../domain/engine/region-cropper';
import type { RecognitionError, TextRecognizer } from '../../domain/engine/text-recognizer';

export type RecognizeRegionDeps = {
  readonly cropper: RegionCropper;
  readonly recognizer: TextRecognizer;
  readonly beginTrace?: TraceFactory;
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
  const trace = (deps.beginTrace ?? noTrace)('recognize');

  try {
    const cropped = await deps.cropper.crop(source, regions, arrangement);
    if (!cropped.ok) {
      trace.step('crop-failed', { kind: cropped.error.kind });
      return err({ kind: 'crop', error: cropped.error });
    }

    using crop = own(cropped.value);
    trace.step('input', {
      recognizer: deps.recognizer.id,
      width: crop.bitmap.width,
      height: crop.bitmap.height,
    });

    const startedAt = performance.now();
    const recognized = await deps.recognizer.recognize(crop.bitmap);
    const elapsedMs = performance.now() - startedAt;
    if (!recognized.ok) {
      trace.step('failed', { kind: recognized.error.kind, elapsedMs });
      return err({ kind: 'recognition', error: recognized.error });
    }

    trace.step('recognized', {
      text: recognized.value.text,
      confidence: recognized.value.confidence,
      elapsedMs,
    });
    return ok(recognized.value);
  } finally {
    trace.end();
  }
}
