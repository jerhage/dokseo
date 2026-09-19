import { describe, expect, it } from 'vitest';
import { own } from './bitmap';

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
