export type OwnedBitmap = {
  readonly bitmap: ImageBitmap;
  release(): ImageBitmap;
} & Disposable;

export function own(bitmap: ImageBitmap): OwnedBitmap {
  let held = true;

  return {
    bitmap,
    release(): ImageBitmap {
      held = false;
      return bitmap;
    },
    [Symbol.dispose](): void {
      if (!held) return;
      held = false;
      bitmap.close();
    },
  };
}
