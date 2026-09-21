import { afterEach, describe, expect, it, vi } from 'vitest';
import { own, releasePicture } from './bitmap';

function counted(): { readonly bitmap: ImageBitmap; readonly closes: () => number } {
  let closes = 0;
  const bitmap = {
    width: 8,
    height: 8,
    close: () => {
      closes += 1;
    },
  } as unknown as ImageBitmap;

  return { bitmap, closes: () => closes };
}

describe('own', () => {
  it('closes the bitmap when the block ends', () => {
    const { bitmap, closes } = counted();
    {
      using owned = own(bitmap);
      expect(owned.bitmap).toBe(bitmap);
    }
    expect(closes()).toBe(1);
  });

  it('closes the bitmap once however often it is disposed', () => {
    const { bitmap, closes } = counted();
    const owned = own(bitmap);
    owned[Symbol.dispose]();
    owned[Symbol.dispose]();
    expect(closes()).toBe(1);
  });

  it('hands the bitmap back and closes nothing once released', () => {
    const { bitmap, closes } = counted();
    {
      using owned = own(bitmap);
      expect(owned.release()).toBe(bitmap);
    }
    expect(closes()).toBe(0);
  });
});

describe('releasePicture', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('revokes the object url of an encoded picture', () => {
    const revoked: string[] = [];
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => void revoked.push(url));

    releasePicture({ kind: 'encoded', url: 'blob:page-4' });

    expect(revoked).toEqual(['blob:page-4']);
  });

  it('closes the bitmap of a drawn picture', () => {
    const { bitmap, closes } = counted();

    releasePicture({ kind: 'drawn', bitmap });

    expect(closes()).toBe(1);
  });
});
