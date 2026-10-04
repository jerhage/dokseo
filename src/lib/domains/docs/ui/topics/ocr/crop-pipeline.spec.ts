import { describe, expect, it } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import { CropPipeline } from './crop-pipeline.svelte';
import type { CropStages } from './crop-stages';

function bitmap(width: number, height: number): ImageBitmap {
  return { width, height, close: () => undefined } as ImageBitmap;
}

function stages(name: string): CropStages {
  return {
    crop: bitmap(name.length * 100, 400),
    capFactor: 1,
    prepared: bitmap(448, 112),
    modelInput: bitmap(224, 224),
  };
}

const REGION: readonly ImageRegion[] = [{ index: imageIndex(0), rect: imageRect(1, 2, 3, 4) }];

type Pending = { readonly resolve: (stages: CropStages) => void };

function controlled(): {
  readonly pipeline: CropPipeline;
  readonly pending: Pending[];
  readonly released: CropStages[];
} {
  const pending: Pending[] = [];
  const released: CropStages[] = [];
  const pipeline = new CropPipeline({
    render: () =>
      new Promise<CropStages>((resolve) => {
        pending.push({ resolve });
      }),
    release: (gone) => {
      released.push(gone);
    },
  });
  return { pipeline, pending, released };
}

describe('CropPipeline', () => {
  it('shows the stages with their sizes and the squash into the model input', async () => {
    const pipeline = new CropPipeline({
      render: async () => stages('one'),
      release: () => undefined,
    });

    await pipeline.show(REGION);

    expect(pipeline.view).toMatchObject({
      kind: 'shown',
      regions: REGION,
      numbers: {
        crop: { width: 300, height: 400 },
        prepared: { width: 448, height: 112 },
        modelInput: { width: 224, height: 224 },
        squash: { across: 0.5, down: 2 },
      },
    });
  });

  it('releases a result that a newer selection overtook', async () => {
    const { pipeline, pending, released } = controlled();
    const first = pipeline.show(REGION);
    const second = pipeline.show(REGION);
    const late = stages('late');

    pending[1]?.resolve(stages('kept'));
    await second;
    pending[0]?.resolve(late);
    await first;

    expect(released).toEqual([late]);
  });

  it('releases the stages it replaces', async () => {
    const { pipeline, pending, released } = controlled();
    const old = stages('old');
    const showing = pipeline.show(REGION);
    pending[0]?.resolve(old);
    await showing;

    const next = pipeline.show(REGION);
    pending[1]?.resolve(stages('new'));
    await next;

    expect(released).toEqual([old]);
  });

  it('reports a render that throws', async () => {
    const pipeline = new CropPipeline({
      render: () => Promise.reject(new Error('no context')),
      release: () => undefined,
    });

    await pipeline.show(REGION);

    expect(pipeline.view).toEqual({ kind: 'failed', message: 'no context' });
  });

  it('releases what it shows when it is disposed', async () => {
    const shown = stages('shown');
    const released: CropStages[] = [];
    const pipeline = new CropPipeline({
      render: async () => shown,
      release: (gone) => {
        released.push(gone);
      },
    });
    await pipeline.show(REGION);

    pipeline.dispose();

    expect({ released, view: pipeline.view }).toEqual({
      released: [shown],
      view: { kind: 'working' },
    });
  });
});
