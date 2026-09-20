import { match } from 'ts-pattern';
import { own } from '$lib/platform/image/bitmap';
import type { OwnedBitmap } from '$lib/platform/image/bitmap';
import { cropFrom, downscaleFor, scaleBy, stitch, toGrayscale } from '$lib/platform/image/pixels';
import { noTrace } from '$lib/platform/trace/pipeline-trace';
import type { Trace, TraceFactory } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import { isEmpty, normalize } from '$lib/shared/geometry';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import type { CropError, RegionCropper } from '../../domain/engine/region-cropper';

function describeSourceError(error: PageSourceError): string {
  return match(error)
    .with(
      { kind: 'out-of-range' },
      (e) => `Image ${e.index} is outside a source of ${e.count} images`,
    )
    .with({ kind: 'decode-failed' }, (e) => `Image ${e.index} did not decode: ${e.cause}`)
    .with({ kind: 'source-unreadable' }, (e) => `The source could not be read: ${e.cause}`)
    .exhaustive();
}

async function cropOne(
  source: PageSource,
  region: ImageRegion,
): Promise<Result<OwnedBitmap, CropError>> {
  const image = await source.image(region.index);
  if (!image.ok) return err({ kind: 'unreadable', cause: describeSourceError(image.error) });

  using page = own(image.value);
  const cropped = cropFrom(page.bitmap, region.rect);
  return ok(cropped);
}

async function cropTraced(
  trace: Trace,
  source: PageSource,
  regions: readonly ImageRegion[],
  arrangement: Arrangement,
): Promise<Result<ImageBitmap, CropError>> {
  const wanted = regions.filter((region) => !isEmpty(normalize(region.rect)));
  if (wanted.length === 0) return err({ kind: 'nothing-selected' });

  try {
    using held = new DisposableStack();
    const parts: ImageBitmap[] = [];
    for (const [order, region] of wanted.entries()) {
      const part = await cropOne(source, region);
      if (!part.ok) return part;

      const cropped = held.use(part.value).bitmap;
      trace.step('region', {
        order,
        index: region.index,
        rect: region.rect,
        width: cropped.width,
        height: cropped.height,
      });
      parts.push(cropped);
    }

    using stitched = stitch(parts, arrangement);
    trace.step('stitched', {
      arrangement,
      parts: parts.length,
      width: stitched.bitmap.width,
      height: stitched.bitmap.height,
    });

    const factor = downscaleFor(stitched.bitmap);
    using capped = scaleBy(stitched.bitmap, factor);
    trace.step('capped', {
      factor,
      width: capped.bitmap.width,
      height: capped.bitmap.height,
    });

    using grey = toGrayscale(capped.bitmap);
    trace.step('greyscale', {
      width: grey.bitmap.width,
      height: grey.bitmap.height,
    });

    trace.image('crop', grey.bitmap);
    return ok(grey.release());
  } catch (cause) {
    return err({ kind: 'unreadable', cause: describeCause(cause) });
  }
}

async function cropRegions(
  trace: Trace,
  source: PageSource,
  regions: readonly ImageRegion[],
  arrangement: Arrangement,
): Promise<Result<ImageBitmap, CropError>> {
  try {
    return await cropTraced(trace, source, regions, arrangement);
  } finally {
    trace.end();
  }
}

function createCanvasCropper(beginTrace: TraceFactory = noTrace): RegionCropper {
  return {
    crop: (source, regions, arrangement) =>
      cropRegions(beginTrace('crop'), source, regions, arrangement),
  };
}

export { createCanvasCropper };
