import { own } from '$lib/platform/image/bitmap';
import { noTrace } from '$lib/platform/trace/pipeline-trace';
import type { TraceFactory } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource } from '$lib/shared/page-source';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { CropError, RegionCropper } from '../../domain/engine/region-cropper';
import type { RecognitionError, TextRecognizer } from '../../domain/engine/text-recognizer';

type RecognizeRegionDeps = {
  readonly cropper: RegionCropper;
  readonly recognizer: TextRecognizer;
  readonly beginTrace?: TraceFactory;
};

type RecognizeRegionResult =
  | { readonly kind: 'success'; readonly text: RecognizedText }
  | CropError
  | RecognitionError;

async function recognizeRegion(
  deps: RecognizeRegionDeps,
  source: PageSource,
  regions: readonly ImageRegion[],
  arrangement: Arrangement,
): Promise<RecognizeRegionResult> {
  const trace = (deps.beginTrace ?? noTrace)('recognize');

  try {
    const cropped = await deps.cropper.crop(source, regions, arrangement);
    if (cropped.kind !== 'success') {
      trace.step('crop-failed', { kind: cropped.kind });
      return cropped;
    }

    using crop = own(cropped.crop);
    trace.step('input', {
      recognizer: deps.recognizer.id,
      width: crop.bitmap.width,
      height: crop.bitmap.height,
    });

    const startedAt = performance.now();
    const recognized = await deps.recognizer.recognize(crop.bitmap);
    const elapsedMs = performance.now() - startedAt;
    if (recognized.kind !== 'success') {
      trace.step('failed', { kind: recognized.kind, elapsedMs });
      return recognized;
    }

    trace.step('recognized', {
      text: recognized.text.text,
      confidence: recognized.text.confidence,
      elapsedMs,
    });
    return recognized;
  } finally {
    trace.end();
  }
}

export { recognizeRegion };
export type { RecognizeRegionDeps, RecognizeRegionResult };
