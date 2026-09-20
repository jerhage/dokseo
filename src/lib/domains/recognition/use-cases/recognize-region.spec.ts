import { describe, expect, it, vi } from 'vitest';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex, type ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import { err, ok, type Result } from '$lib/shared/result';
import { recognizedText, type RecognizedText } from '../domain/recognized-text';
import type { CropError, RegionCropper } from '../domain/region-cropper';
import type { RecognitionError, TextRecognizer } from '../domain/text-recognizer';
import { recognizeRegion, type RecognizeRegionDeps } from './recognize-region';

const REGIONS: readonly ImageRegion[] = [
  { index: imageIndex(3), rect: imageRect(10, 20, 100, 40) },
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
  return {
    count: 1,
    image: (index: ImageIndex) =>
      Promise.resolve(err<PageSourceError>({ kind: 'out-of-range', index, count: 1 })),
    close,
    [Symbol.dispose]: close,
  };
}

function fakeCropper(outcome: Result<ImageBitmap, CropError>) {
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
  outcome: Result<RecognizedText, RecognitionError> = ok(recognizedText('こっちに来て')),
) {
  let calls = 0;
  const recognizer: TextRecognizer = {
    id: 'stub',
    prepare: () => Promise.resolve(err({ kind: 'unavailable', cause: 'not used' })),
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
    prepare: () => Promise.resolve(err({ kind: 'unavailable', cause: 'not used' })),
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
  it('returns the recognized text', async () => {
    const crop = stubBitmap();
    const { cropper } = fakeCropper(ok(crop.bitmap));
    const { recognizer } = fakeRecognizer();

    const result = await run({ cropper, recognizer });

    expect(result).toEqual(ok(recognizedText('こっちに来て')));
  });

  it('closes the crop after a successful recognition', async () => {
    const crop = stubBitmap();
    const { cropper } = fakeCropper(ok(crop.bitmap));
    const { recognizer } = fakeRecognizer();

    await run({ cropper, recognizer });

    expect(crop.wasClosed()).toBe(true);
  });

  it('wraps a crop failure', async () => {
    const { cropper } = fakeCropper(err({ kind: 'nothing-selected' }));
    const { recognizer } = fakeRecognizer();

    const result = await run({ cropper, recognizer });

    expect(result).toEqual(err({ kind: 'crop', error: { kind: 'nothing-selected' } }));
  });

  it('does not recognize when the crop fails', async () => {
    const { cropper } = fakeCropper(err({ kind: 'unreadable', cause: 'no page' }));
    const { recognizer, callCount } = fakeRecognizer();

    await run({ cropper, recognizer });

    expect(callCount()).toBe(0);
  });

  it('wraps a recognition failure', async () => {
    const crop = stubBitmap();
    const { cropper } = fakeCropper(ok(crop.bitmap));
    const { recognizer } = fakeRecognizer(err({ kind: 'no-text' }));

    const result = await run({ cropper, recognizer });

    expect(result).toEqual(err({ kind: 'recognition', error: { kind: 'no-text' } }));
  });

  it('closes the crop after a recognition failure', async () => {
    const crop = stubBitmap();
    const { cropper } = fakeCropper(ok(crop.bitmap));
    const { recognizer } = fakeRecognizer(
      err({ kind: 'model-unavailable', cause: 'no weights cached' }),
    );

    await run({ cropper, recognizer });

    expect(crop.wasClosed()).toBe(true);
  });

  it('closes the crop when the recognizer throws', async () => {
    const crop = stubBitmap();
    const { cropper } = fakeCropper(ok(crop.bitmap));

    await expect(run({ cropper, recognizer: throwingRecognizer() })).rejects.toThrow(
      'the model fell over',
    );
    expect(crop.wasClosed()).toBe(true);
  });

  it('ends the trace after a successful recognition', async () => {
    const crop = stubBitmap();
    const { cropper } = fakeCropper(ok(crop.bitmap));
    const { recognizer } = fakeRecognizer();
    const { beginTrace, end, steps } = stubTrace();

    await run({ cropper, recognizer, beginTrace });

    expect(steps).toEqual(['input', 'recognized']);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('ends the trace after a crop failure', async () => {
    const { cropper } = fakeCropper(err({ kind: 'nothing-selected' }));
    const { recognizer } = fakeRecognizer();
    const { beginTrace, end, steps } = stubTrace();

    await run({ cropper, recognizer, beginTrace });

    expect(steps).toEqual(['crop-failed']);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('ends the trace when the recognizer throws', async () => {
    const crop = stubBitmap();
    const { cropper } = fakeCropper(ok(crop.bitmap));
    const { beginTrace, end } = stubTrace();

    await expect(run({ cropper, recognizer: throwingRecognizer(), beginTrace })).rejects.toThrow(
      'the model fell over',
    );
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('crops once per call', async () => {
    const crop = stubBitmap();
    const { cropper, callCount } = fakeCropper(ok(crop.bitmap));
    const { recognizer } = fakeRecognizer();

    await run({ cropper, recognizer });

    expect(callCount()).toBe(1);
  });
});
