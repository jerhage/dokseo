import { imageIndex, type ImageIndex } from './ids';

export const IMAGE_PARAMETER = 'image';

export const MISSING_BOOK_PARAMETER = 'missing';

export const MISSING_BOOK_VALUE = 'book';

export const MISSING_BOOK_NOTICE = 'That book is no longer in your library.';

export const LIBRARY_AFTER_MISSING_BOOK = `/?${MISSING_BOOK_PARAMETER}=${MISSING_BOOK_VALUE}`;

export type OpeningPlace = {
  readonly index: ImageIndex;
  readonly asked: boolean;
  readonly clamped: boolean;
};

const WHOLE_NUMBER = /^\d+$/;

export function readImageIndex(value: string | null | undefined): ImageIndex | null {
  if (value === null || value === undefined) return null;

  const trimmed = value.trim();
  if (!WHOLE_NUMBER.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? imageIndex(parsed) : null;
}

export function openingPlace(
  asked: ImageIndex | null,
  saved: ImageIndex,
  imageCount: number,
): OpeningPlace | null {
  if (imageCount <= 0) return null;

  const last = imageCount - 1;
  const wanted = asked ?? saved;

  return {
    index: imageIndex(Math.min(Math.max(wanted, 0), last)),
    asked: asked !== null,
    clamped: asked !== null && asked > last,
  };
}

export function urlWithImageIndex(url: URL, index: ImageIndex): URL | null {
  const moved = new URL(url);
  moved.searchParams.set(IMAGE_PARAMETER, String(index));
  return moved.href === url.href ? null : moved;
}

export function missingBookNotice(value: string | null | undefined): string | null {
  return value === MISSING_BOOK_VALUE ? MISSING_BOOK_NOTICE : null;
}
