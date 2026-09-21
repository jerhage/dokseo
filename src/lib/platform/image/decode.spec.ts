import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeImage } from './decode';

const decode = vi.fn();

beforeEach(() => {
  decode.mockReset();
  vi.stubGlobal('createImageBitmap', decode);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('decodeImage', () => {
  it('honours the orientation the img element honours', async () => {
    const bitmap = {} as ImageBitmap;
    decode.mockResolvedValue(bitmap);
    const blob = new Blob(['bytes'], { type: 'image/jpeg' });

    await expect(decodeImage(blob)).resolves.toBe(bitmap);
    expect(decode).toHaveBeenCalledWith(blob, { imageOrientation: 'from-image' });
  });

  it('names the blob when it will not decode', async () => {
    decode.mockRejectedValue(new Error('not an image'));

    await expect(decodeImage(new Blob(['bytes'], { type: 'image/jpeg' }))).rejects.toThrow(
      /image\/jpeg.*not an image/u,
    );
  });

  it('says the type is unknown when the blob carries none', async () => {
    decode.mockRejectedValue(new Error('not an image'));

    await expect(decodeImage(new Blob(['bytes']))).rejects.toThrow(/unknown type/u);
  });
});
