import { match } from 'ts-pattern';
import { own } from '$lib/platform/image/bitmap';
import type { OwnedBitmap } from '$lib/platform/image/bitmap';
import { cropFrom, stitch } from '$lib/platform/image/pixels';
import { noTrace } from '$lib/platform/trace/pipeline-trace';
import type { Trace, TraceFactory } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import { imageRectOf, isEmpty, normalize } from '$lib/shared/geometry';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import type { CropError, Cropping, RegionCropper } from '../../domain/engine/region-cropper';

type RegionCrop = { readonly kind: 'success'; readonly part: OwnedBitmap } | CropError;

function describeSourceError(error: PageSourceError): string {
  return match(error)
    .with(
      { kind: 'out-of-range' },
      (e) => `Image ${e.index} is outside a source of ${e.count} images`,
    )
    .with({ kind: 'page-unreadable' }, (e) => `Image ${e.index} could not be read: ${e.cause}`)
    .with({ kind: 'decode-failed' }, (e) => `Image ${e.index} did not decode: ${e.cause}`)
    .with({ kind: 'render-failed' }, (e) => `Image ${e.index} did not render: ${e.cause}`)
    .with({ kind: 'source-unreadable' }, (e) => `The source could not be read: ${e.cause}`)
    .exhaustive();
}

async function cropOne(source: PageSource, region: ImageRegion): Promise<RegionCrop> {
  const image = await source.image(region.index);
  if (image.kind !== 'success') {
    return { kind: 'unreadable', cause: describeSourceError(image) };
  }

  using page = own(image.image);
  const natural = { width: page.bitmap.width, height: page.bitmap.height };
  const cropped = await cropFrom(page.bitmap, imageRectOf(region.rect, natural));
  return { kind: 'success', part: cropped };
}

async function cropTraced(
  trace: Trace,
  source: PageSource,
  regions: readonly ImageRegion[],
  arrangement: Arrangement,
): Promise<Cropping> {
  const wanted = regions.filter((region) => !isEmpty(normalize(region.rect)));
  if (wanted.length === 0) return { kind: 'nothing-selected' };

  try {
    using held = new DisposableStack();
    const parts: ImageBitmap[] = [];
    for (const [order, region] of wanted.entries()) {
      const part = await cropOne(source, region);
      if (part.kind !== 'success') return part;

      const cropped = held.use(part.part).bitmap;
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

    trace.image('crop', stitched.bitmap);
    return { kind: 'success', crop: stitched.release() };
  } catch (cause) {
    return { kind: 'unreadable', cause: describeCause(cause) };
  }
}

async function cropRegions(
  trace: Trace,
  source: PageSource,
  regions: readonly ImageRegion[],
  arrangement: Arrangement,
): Promise<Cropping> {
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
