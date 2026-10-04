import { match } from 'ts-pattern';
import { inputPreparationFor } from '$lib/domains/recognition/domain/engine/input-preparation';
import { downscaleFor } from '$lib/domains/recognition/domain/engine/model-input';
import { own } from '$lib/platform/image/bitmap';
import type { OwnedBitmap } from '$lib/platform/image/bitmap';
import { cropFrom, scaleBy, stitch, toGrayscale } from '$lib/platform/image/pixels';
import type { Arrangement } from '$lib/shared/arrangement';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource } from '$lib/shared/page-source';
import { MANGA_OCR_INPUT } from '../../../domain/ocr-crop';
import type { PixelSize } from '../../../domain/ocr-crop';

type CropStages = {
  readonly crop: ImageBitmap;
  readonly capFactor: number;
  readonly prepared: ImageBitmap;
  readonly modelInput: ImageBitmap;
};

function squashedTo(bitmap: ImageBitmap, size: PixelSize): OwnedBitmap {
  const canvas = new OffscreenCanvas(size.width, size.height);
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('A 2D drawing context was unavailable for the model input');

  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return own(canvas.transferToImageBitmap());
}

async function cropStages(
  source: PageSource,
  regions: readonly ImageRegion[],
  arrangement: Arrangement,
): Promise<CropStages> {
  using held = new DisposableStack();
  const parts: ImageBitmap[] = [];
  for (const region of regions) {
    const read = await source.image(region.index);
    if (read.kind !== 'success') throw new Error(`The sample page did not decode: ${read.kind}`);

    using page = own(read.image);
    parts.push(held.use(await cropFrom(page.bitmap, region.rect)).bitmap);
  }

  using stitched = stitch(parts, arrangement);
  const preparation = inputPreparationFor('manga-ocr');
  const capFactor = downscaleFor(stitched.bitmap, preparation.maxEdge);
  using capped = scaleBy(stitched.bitmap, capFactor);
  using prepared = match(preparation)
    .with({ kind: 'pillow-grey' }, () => toGrayscale(capped.bitmap))
    .with({ kind: 'colour' }, () => own(capped.release()))
    .exhaustive();
  using modelInput = squashedTo(prepared.bitmap, MANGA_OCR_INPUT);

  return {
    crop: stitched.release(),
    capFactor,
    prepared: prepared.release(),
    modelInput: modelInput.release(),
  };
}

function closeStages(stages: CropStages): void {
  stages.crop.close();
  stages.prepared.close();
  stages.modelInput.close();
}

export { closeStages, cropStages };
export type { CropStages };
