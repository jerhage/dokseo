import { match } from 'ts-pattern';
import { own, type OwnedBitmap } from '$lib/platform/image/bitmap';
import {
  cropFrom,
  invert,
  meanLuminance,
  scaleBy,
  stitch,
  toGrayscale,
} from '$lib/platform/image/pixels';
import type { Arrangement } from '$lib/shared/arrangement';
import { describeCause } from '$lib/shared/cause';
import { isEmpty, normalize } from '$lib/shared/geometry';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import { err, ok, type Result } from '$lib/shared/result';
import { shouldInvert, upscaleFor } from '../domain/preprocess';
import type { CropError, RegionCropper } from '../domain/region-cropper';

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

async function cropRegions(
  source: PageSource,
  regions: readonly ImageRegion[],
  arrangement: Arrangement,
): Promise<Result<ImageBitmap, CropError>> {
  const wanted = regions.filter((region) => !isEmpty(normalize(region.rect)));
  if (wanted.length === 0) return err({ kind: 'nothing-selected' });

  try {
    using held = new DisposableStack();
    const parts: ImageBitmap[] = [];
    for (const region of wanted) {
      const part = await cropOne(source, region);
      if (!part.ok) return part;
      parts.push(held.use(part.value).bitmap);
    }

    using stitched = stitch(parts, arrangement);
    using scaled = scaleBy(stitched.bitmap, upscaleFor(stitched.bitmap));
    using grey = toGrayscale(scaled.bitmap);
    if (!shouldInvert(meanLuminance(grey.bitmap))) return ok(grey.release());

    using inverted = invert(grey.bitmap);
    return ok(inverted.release());
  } catch (cause) {
    return err({ kind: 'unreadable', cause: describeCause(cause) });
  }
}

export function createCanvasCropper(): RegionCropper {
  return { crop: cropRegions };
}
