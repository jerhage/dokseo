import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeAnyImage, decodeImage } from './decode';

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

class FakeImage {
  src = '';
  decoded = 0;

  async decode(): Promise<void> {
    this.decoded += 1;
    if (this.src === '') throw new Error('no source');
  }
}

describe('decodeAnyImage', () => {
  it('decodes a raster cover from its bytes', async () => {
    const bitmap = {} as ImageBitmap;
    decode.mockResolvedValue(bitmap);
    const blob = new Blob(['bytes'], { type: 'image/png' });

    await expect(decodeAnyImage(blob)).resolves.toBe(bitmap);
    expect(decode).toHaveBeenCalledWith(blob, { imageOrientation: 'from-image' });
  });

  it('draws an SVG cover through an element, which is the only thing that decodes one', async () => {
    const bitmap = {} as ImageBitmap;
    const drawn: unknown[] = [];
    decode.mockImplementation((source: unknown) => {
      drawn.push(source);
      return Promise.resolve(bitmap);
    });
    vi.stubGlobal('Image', FakeImage);
    const created: string[] = [];
    const revoked: string[] = [];
    vi.stubGlobal('URL', {
      createObjectURL: (blob: Blob) => {
        created.push(blob.type);
        return 'blob:cover';
      },
      revokeObjectURL: (url: string) => revoked.push(url),
    });

    const svg = new Blob(['<svg/>'], { type: 'image/svg+xml' });
    await expect(decodeAnyImage(svg)).resolves.toBe(bitmap);

    expect(created).toEqual(['image/svg+xml']);
    expect(revoked).toEqual(['blob:cover']);
    expect(drawn.at(0)).toBeInstanceOf(FakeImage);
  });

  it('revokes the url when an SVG cover will not draw', async () => {
    decode.mockRejectedValue(new Error('zero sized'));
    vi.stubGlobal('Image', FakeImage);
    const revoked: string[] = [];
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:cover',
      revokeObjectURL: (url: string) => revoked.push(url),
    });

    await expect(decodeAnyImage(new Blob(['<svg/>'], { type: 'image/svg+xml' }))).rejects.toThrow(
      /could not be drawn.*zero sized/u,
    );
    expect(revoked).toEqual(['blob:cover']);
  });
});
