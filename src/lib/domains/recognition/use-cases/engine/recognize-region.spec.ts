import { describe, expect, it, vi } from 'vitest';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import { pageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource } from '$lib/shared/page-source';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { Cropping, RegionCropper } from '../../domain/engine/region-cropper';
import type { Recognition, TextRecognizer } from '../../domain/engine/text-recognizer';
import { recognizeRegion } from './recognize-region';
import type { RecognizeRegionDeps } from './recognize-region';

const REGIONS: readonly ImageRegion[] = [
  { index: imageIndex(3), rect: pageRect(0.01, 0.02, 0.1, 0.04) },
];

const ARRANGEMENT: Arrangement = 'row';

type StubBitmap = { readonly bitmap: ImageBitmap; wasClosed(): boolean };

function stubBitmap(): StubBitmap {
  let closed = false;
  const bitmap = {
    width: 200,
    height: 80,
    close: (): void => {
      closed = true;
    },
  } as unknown as ImageBitmap;

  return { bitmap, wasClosed: () => closed };
}

function fakePageSource(): PageSource {
  const close = (): void => undefined;
  const missing = (index: ImageIndex) =>
    Promise.resolve({ kind: 'out-of-range' as const, index, count: 1 });

  return {
    count: 1,
    picture: missing,
    image: missing,
    sizes: () => Promise.resolve({ kind: 'success' as const, sizes: [] }),
    close,
    [Symbol.dispose]: close,
  };
}

function cropped(bitmap: ImageBitmap): Cropping {
  return { kind: 'success', crop: bitmap };
}

function fakeCropper(outcome: Cropping) {
  let calls = 0;
  const cropper: RegionCropper = {
    crop: () => {
      calls += 1;
      return Promise.resolve(outcome);
    },
  };
  return { cropper, callCount: () => calls };
}

function fakeRecognizer(
  outcome: Recognition = { kind: 'success', text: recognizedText('こっちに来て') },
) {
  let calls = 0;
  const recognizer: TextRecognizer = {
    id: 'stub',
    prepare: () => Promise.resolve({ kind: 'unavailable', cause: 'not used' }),
    cancel: () => undefined,
    recognize: () => {
      calls += 1;
      return Promise.resolve(outcome);
    },
  };
  return { recognizer, callCount: () => calls };
}

function throwingRecognizer(): TextRecognizer {
  return {
    id: 'stub',
    prepare: () => Promise.resolve({ kind: 'unavailable', cause: 'not used' }),
    cancel: () => undefined,
    recognize: () => Promise.reject(new Error('the model fell over')),
  };
}

function stubTrace() {
  const end = vi.fn();
  const steps: string[] = [];
  const trace: Trace = {
    step: (name: string) => {
      steps.push(name);
    },
    image: () => undefined,
    end,
  };
  return { beginTrace: () => trace, end, steps };
}

function run(deps: RecognizeRegionDeps) {
  return recognizeRegion(deps, fakePageSource(), REGIONS, ARRANGEMENT);
}

describe('recognizeRegion', () => {
  it('returns the recognized text, cropping once', async () => {
    const crop = stubBitmap();
    const { cropper, callCount } = fakeCropper(cropped(crop.bitmap));
    const { recognizer } = fakeRecognizer();

    const result = await run({ cropper, recognizer });

    expect(result).toEqual({ kind: 'success', text: recognizedText('こっちに来て') });
    expect(callCount()).toBe(1);
  });

  it.each([{ kind: 'nothing-selected' }, { kind: 'unreadable', cause: 'no page' }] as const)(
    'passes the crop failure $kind through without recognizing',
    async (failure) => {
      const { cropper } = fakeCropper(failure);
      const { recognizer, callCount } = fakeRecognizer();

      const result = await run({ cropper, recognizer });

      expect(result).toEqual(failure);
      expect(callCount()).toBe(0);
    },
  );

  it('passes a recognition failure through', async () => {
    const crop = stubBitmap();
    const { cropper } = fakeCropper(cropped(crop.bitmap));
    const { recognizer } = fakeRecognizer({ kind: 'no-text' });

    const result = await run({ cropper, recognizer });

    expect(result).toEqual({ kind: 'no-text' });
  });

  it.each([
    ['a successful recognition', () => fakeRecognizer().recognizer, false],
    [
      'a recognition failure',
      () => fakeRecognizer({ kind: 'model-unavailable', cause: 'no weights cached' }).recognizer,
      false,
    ],
    ['a recognizer that throws', throwingRecognizer, true],
  ] as const)(
    'closes the crop and ends the trace once after %s',
    async (_ending, recognizerOf, throws) => {
      const crop = stubBitmap();
      const { cropper } = fakeCropper(cropped(crop.bitmap));
      const { beginTrace, end } = stubTrace();

      const recognition = run({ cropper, recognizer: recognizerOf(), beginTrace });
      if (throws) await expect(recognition).rejects.toThrow('the model fell over');
      else await recognition;

      expect(crop.wasClosed()).toBe(true);
      expect(end).toHaveBeenCalledTimes(1);
    },
  );

  it('ends the trace after a successful recognition', async () => {
    const crop = stubBitmap();
    const { cropper } = fakeCropper(cropped(crop.bitmap));
    const { recognizer } = fakeRecognizer();
    const { beginTrace, end, steps } = stubTrace();

    await run({ cropper, recognizer, beginTrace });

    expect(steps).toEqual(['input', 'recognized']);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('ends the trace after a crop failure', async () => {
    const { cropper } = fakeCropper({ kind: 'nothing-selected' });
    const { recognizer } = fakeRecognizer();
    const { beginTrace, end, steps } = stubTrace();

    await run({ cropper, recognizer, beginTrace });

    expect(steps).toEqual(['crop-failed']);
    expect(end).toHaveBeenCalledTimes(1);
  });
});
