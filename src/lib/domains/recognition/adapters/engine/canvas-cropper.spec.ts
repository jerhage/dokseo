import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_MODEL_INPUT_EDGE } from '../../domain/engine/model-input';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Arrangement } from '$lib/shared/arrangement';
import { pageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { ImageRead, PageSource } from '$lib/shared/page-source';
import { createCanvasCropper } from './canvas-cropper';

const REGIONS: readonly ImageRegion[] = [
  { index: imageIndex(2), rect: pageRect(0.05, 0.25, 0.5, 0.5) },
];

const ARRANGEMENT: Arrangement = 'row';

const WIDE_REGIONS: readonly ImageRegion[] = [{ index: imageIndex(0), rect: pageRect(0, 0, 1, 1) }];

function stubBitmap(width: number, height: number): ImageBitmap {
  return { width, height, close: () => undefined } as unknown as ImageBitmap;
}

type SourceRect = { x: number; y: number; width: number; height: number };

function stubPixelWork(asked: SourceRect[] = []): void {
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
    (_source: ImageBitmap, x: number, y: number, width: number, height: number) => {
      asked.push({ x, y, width, height });
      return Promise.resolve(stubBitmap(width, height));
    },
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

function pageSource(answer: () => ImageRead): PageSource {
  const close = (): void => undefined;
  return {
    count: 1,
    picture: (_index: ImageIndex) =>
      Promise.resolve({ kind: 'source-unreadable', cause: 'not asked for' }),
    image: (_index: ImageIndex) => Promise.resolve(answer()),
    sizes: () => Promise.resolve({ kind: 'success', sizes: [] }),
    close,
    [Symbol.dispose]: close,
  };
}

function unreadableSource(): PageSource {
  return pageSource(() => ({ kind: 'source-unreadable', cause: 'the file went away' }));
}

function decodedSource(): PageSource {
  return pageSource(() => ({ kind: 'success', image: stubBitmap(200, 80) }));
}

function sourceOf(width: number, height: number): PageSource {
  return pageSource(() => ({ kind: 'success', image: stubBitmap(width, height) }));
}

function wideSource(): PageSource {
  return pageSource(() => ({ kind: 'success', image: stubBitmap(6000, 900) }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createCanvasCropper', () => {
  it.each([
    {
      exit: 'nothing is selected',
      source: unreadableSource,
      regions: [],
      kind: 'nothing-selected',
    },
    {
      exit: 'the source cannot be read',
      source: unreadableSource,
      regions: REGIONS,
      kind: 'unreadable',
    },
    { exit: 'the pixel work throws', source: decodedSource, regions: REGIONS, kind: 'unreadable' },
  ])('ends the trace once when $exit', async ({ source, regions, kind }) => {
    const { begin, end } = stubTrace();

    const result = await createCanvasCropper(begin).crop(source(), regions, ARRANGEMENT);

    expect(result.kind).toBe(kind);
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

    if (result.kind !== 'success') throw new Error('The crop failed');
    expect(result.crop.width).toBe(6000);
    expect(result.crop.height).toBe(900);
    expect(result.crop.width).toBeGreaterThan(MAX_MODEL_INPUT_EDGE);
  });

  it('cuts the stored fractions out of the pixels of the page as decoded', async () => {
    const asked: SourceRect[] = [];
    stubPixelWork(asked);

    await createCanvasCropper().crop(sourceOf(200, 80), REGIONS, ARRANGEMENT);

    expect(asked).toEqual([{ x: 10, y: 20, width: 100, height: 40 }]);
  });

  it('cuts the same part of a PDF page at any render scale', async () => {
    const asked: SourceRect[] = [];
    stubPixelWork(asked);
    const stored = [{ index: imageIndex(0), rect: pageRect(0.25, 0.125, 0.5, 0.25) }];
    const cropper = createCanvasCropper();

    await cropper.crop(sourceOf(720, 1008), stored, ARRANGEMENT);
    await cropper.crop(sourceOf(1440, 2016), stored, ARRANGEMENT);

    expect(asked).toEqual([
      { x: 180, y: 126, width: 360, height: 252 },
      { x: 360, y: 252, width: 720, height: 504 },
    ]);
  });

  it('crops without a trace factory', async () => {
    const result = await createCanvasCropper().crop(unreadableSource(), [], ARRANGEMENT);

    expect(result).toEqual({ kind: 'nothing-selected' });
  });
});
