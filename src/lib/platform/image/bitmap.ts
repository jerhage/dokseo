import type { PagePicture } from '$lib/shared/page-source';

type OwnedBitmap = {
  readonly bitmap: ImageBitmap;
  release(): ImageBitmap;
} & Disposable;

function own(bitmap: ImageBitmap): OwnedBitmap {
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

function releasePicture(picture: PagePicture): void {
  if (picture.kind === 'encoded') {
    URL.revokeObjectURL(picture.url);
    return;
  }

  picture.bitmap.close();
}

export { own, releasePicture };
export type { OwnedBitmap };
