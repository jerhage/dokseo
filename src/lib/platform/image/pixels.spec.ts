import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageRect } from '$lib/shared/geometry';
import type { ImageRect } from '$lib/shared/geometry';
import { cropFrom } from './pixels';

const PAGE_WIDTH = 100;

const PAGE_HEIGHT = 80;

const crop = vi.fn();

type SourceRect = { x: number; y: number; width: number; height: number };

function stubBitmap(width: number, height: number): ImageBitmap {
  return { width, height, close: () => undefined } as unknown as ImageBitmap;
}

function sourceRect(): SourceRect {
  const [, x, y, width, height] = crop.mock.calls[0] as [
    ImageBitmap,
    number,
    number,
    number,
    number,
  ];
  return { x, y, width, height };
}

beforeEach(() => {
  crop.mockReset();
  crop.mockResolvedValue(stubBitmap(1, 1));
  vi.stubGlobal('createImageBitmap', crop);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cropFrom', () => {
  const overhangs: readonly { readonly edge: string; readonly rect: ImageRect }[] = [
    { edge: 'left', rect: imageRect(-20, 10, 50, 20) },
    { edge: 'top', rect: imageRect(10, -15, 30, 40) },
    { edge: 'right', rect: imageRect(80, 10, 50, 20) },
    { edge: 'bottom', rect: imageRect(10, 60, 30, 40) },
  ];

  it('asks for a region inside the image exactly as given', async () => {
    const cropped = stubBitmap(30, 20);
    crop.mockResolvedValue(cropped);
    const page = stubBitmap(PAGE_WIDTH, PAGE_HEIGHT);

    const owned = await cropFrom(page, imageRect(10, 12, 30, 20));

    expect(crop).toHaveBeenCalledWith(page, 10, 12, 30, 20);
    expect(owned.bitmap).toBe(cropped);
  });

  it.each(overhangs)(
    'keeps a region hanging off the $edge edge inside the image',
    async ({ rect }) => {
      await cropFrom(stubBitmap(PAGE_WIDTH, PAGE_HEIGHT), rect);

      const area = sourceRect();
      expect(area.x).toBeGreaterThanOrEqual(0);
      expect(area.y).toBeGreaterThanOrEqual(0);
      expect(area.x + area.width).toBeLessThanOrEqual(PAGE_WIDTH);
      expect(area.y + area.height).toBeLessThanOrEqual(PAGE_HEIGHT);
    },
  );

  it('trims a region hanging off the left edge to the pixels it shares with the image', async () => {
    await cropFrom(stubBitmap(PAGE_WIDTH, PAGE_HEIGHT), imageRect(-20, 10, 50, 20));

    expect(sourceRect()).toEqual({ x: 0, y: 10, width: 30, height: 20 });
  });

  it('rejects a region that covers no pixels of the image', async () => {
    await expect(
      cropFrom(stubBitmap(PAGE_WIDTH, PAGE_HEIGHT), imageRect(150, 10, 20, 20)),
    ).rejects.toThrow(/20x20 region at 150,10 covers no pixels of a 100x80 image/u);
    expect(crop).not.toHaveBeenCalled();
  });

  it('rounds a fractional region outwards', async () => {
    await cropFrom(stubBitmap(PAGE_WIDTH, PAGE_HEIGHT), imageRect(10.4, 12.6, 30.3, 20.1));

    expect(sourceRect()).toEqual({ x: 10, y: 12, width: 31, height: 21 });
  });

  it('keeps a fractional region at the far corner inside the image', async () => {
    await cropFrom(stubBitmap(PAGE_WIDTH, PAGE_HEIGHT), imageRect(98.5, 78.25, 10, 10));

    const area = sourceRect();
    expect(area).toEqual({ x: 98, y: 78, width: 2, height: 2 });
    expect(area.x + area.width).toBeLessThanOrEqual(PAGE_WIDTH);
    expect(area.y + area.height).toBeLessThanOrEqual(PAGE_HEIGHT);
  });
});
