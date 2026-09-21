import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_CROP_EDGE } from '$lib/platform/image/pixels';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource, PageSourceError } from '$lib/shared/page-source';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { createCanvasCropper } from './canvas-cropper';

const REGIONS: readonly ImageRegion[] = [
  { index: imageIndex(2), rect: imageRect(10, 20, 100, 40) },
];

const ARRANGEMENT: Arrangement = 'row';

const WIDE_REGIONS: readonly ImageRegion[] = [
  { index: imageIndex(0), rect: imageRect(0, 0, 6000, 900) },
];

function stubBitmap(width: number, height: number): ImageBitmap {
  return { width, height, close: () => undefined } as unknown as ImageBitmap;
}

function stubPixelWork(): void {
  function FakeCanvas(this: unknown, width: number, height: number): unknown {
    const canvas = {
      getContext: () => context,
      transferToImageBitmap: () => stubBitmap(width, height),
    };
    const context = {
      canvas,
      fillStyle: '',
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      fillRect: (): void => undefined,
      drawImage: (): void => undefined,
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: (): void => undefined,
    };
    return canvas;
  }

  vi.stubGlobal('OffscreenCanvas', FakeCanvas);
  vi.stubGlobal(
    'createImageBitmap',
    (_source: ImageBitmap, _x: number, _y: number, width: number, height: number) =>
      Promise.resolve(stubBitmap(width, height)),
  );
}

function stubTrace() {
  const end = vi.fn();
  const labels: string[] = [];
  const trace: Trace = { step: () => undefined, image: () => undefined, end };
  const begin = (label: string): Trace => {
    labels.push(label);
    return trace;
  };
  return { begin, end, labels };
}

function pageSource(answer: () => Result<ImageBitmap, PageSourceError>): PageSource {
  const close = (): void => undefined;
  return {
    count: 1,
    picture: (_index: ImageIndex) =>
      Promise.resolve(err<PageSourceError>({ kind: 'source-unreadable', cause: 'not asked for' })),
    image: (_index: ImageIndex) => Promise.resolve(answer()),
    close,
    [Symbol.dispose]: close,
  };
}

function unreadableSource(): PageSource {
  return pageSource(() => err({ kind: 'source-unreadable', cause: 'the file went away' }));
}

function decodedSource(): PageSource {
  return pageSource(() => ok(stubBitmap(200, 80)));
}

function wideSource(): PageSource {
  return pageSource(() => ok(stubBitmap(6000, 900)));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createCanvasCropper', () => {
  it('ends the trace when nothing is selected', async () => {
    const { begin, end } = stubTrace();

    const result = await createCanvasCropper(begin).crop(unreadableSource(), [], ARRANGEMENT);

    expect(result).toEqual(err({ kind: 'nothing-selected' }));
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('ends the trace when the source cannot be read', async () => {
    const { begin, end } = stubTrace();

    const result = await createCanvasCropper(begin).crop(unreadableSource(), REGIONS, ARRANGEMENT);

    expect(result.ok).toBe(false);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('ends the trace when the pixel work throws', async () => {
    const { begin, end } = stubTrace();

    const result = await createCanvasCropper(begin).crop(decodedSource(), REGIONS, ARRANGEMENT);

    expect(result.ok).toBe(false);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('opens one trace per crop', async () => {
    const { begin, labels } = stubTrace();
    const cropper = createCanvasCropper(begin);

    await cropper.crop(unreadableSource(), [], ARRANGEMENT);
    await cropper.crop(unreadableSource(), [], ARRANGEMENT);

    expect(labels).toEqual(['crop', 'crop']);
  });

  it('answers the stitched crop at its own size, past the model input limit', async () => {
    stubPixelWork();
    const { begin } = stubTrace();

    const result = await createCanvasCropper(begin).crop(wideSource(), WIDE_REGIONS, ARRANGEMENT);

    if (!result.ok) throw new Error('The crop failed');
    expect(result.value.width).toBe(6000);
    expect(result.value.height).toBe(900);
    expect(result.value.width).toBeGreaterThan(MAX_CROP_EDGE);
  });

  it('crops without a trace factory', async () => {
    const result = await createCanvasCropper().crop(unreadableSource(), [], ARRANGEMENT);

    expect(result).toEqual(err({ kind: 'nothing-selected' }));
  });
});
