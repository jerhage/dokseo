import type { ImageRegion } from '$lib/shared/image-region';
import { describeCause } from '$lib/shared/cause';
import { MANGA_OCR_INPUT, squashInto } from '../../../domain/ocr-crop';
import type { PixelSize, Squash } from '../../../domain/ocr-crop';
import type { CropStages } from './crop-stages';

type CropNumbers = {
  readonly crop: PixelSize;
  readonly capFactor: number;
  readonly prepared: PixelSize;
  readonly modelInput: PixelSize;
  readonly squash: Squash;
};

type CropView =
  | { readonly kind: 'working' }
  | {
      readonly kind: 'shown';
      readonly regions: readonly ImageRegion[];
      readonly stages: CropStages;
      readonly numbers: CropNumbers;
    }
  | { readonly kind: 'failed'; readonly message: string };

type CropPipelineDeps = {
  readonly render: (regions: readonly ImageRegion[]) => Promise<CropStages>;
  readonly release: (stages: CropStages) => void;
};

function sizeOf(bitmap: ImageBitmap): PixelSize {
  return { width: bitmap.width, height: bitmap.height };
}

function numbersOf(stages: CropStages): CropNumbers {
  const prepared = sizeOf(stages.prepared);
  return {
    crop: sizeOf(stages.crop),
    capFactor: stages.capFactor,
    prepared,
    modelInput: MANGA_OCR_INPUT,
    squash: squashInto(prepared, MANGA_OCR_INPUT),
  };
}

class CropPipeline {
  #view = $state.raw<CropView>({ kind: 'working' });
  #generation = 0;
  readonly #deps: CropPipelineDeps;

  constructor(deps: CropPipelineDeps) {
    this.#deps = deps;
  }

  get view(): CropView {
    return this.#view;
  }

  async show(regions: readonly ImageRegion[]): Promise<void> {
    this.#generation += 1;
    const generation = this.#generation;

    let stages: CropStages;
    try {
      stages = await this.#deps.render(regions);
    } catch (cause) {
      if (generation === this.#generation)
        this.#replace({ kind: 'failed', message: describeCause(cause) });
      return;
    }

    if (generation !== this.#generation) {
      this.#deps.release(stages);
      return;
    }

    this.#replace({ kind: 'shown', regions, stages, numbers: numbersOf(stages) });
  }

  dispose(): void {
    this.#generation += 1;
    this.#replace({ kind: 'working' });
  }

  #replace(next: CropView): void {
    const previous = this.#view;
    this.#view = next;
    if (previous.kind === 'shown') this.#deps.release(previous.stages);
  }
}

export { CropPipeline, numbersOf };
export type { CropNumbers, CropPipelineDeps, CropView };
