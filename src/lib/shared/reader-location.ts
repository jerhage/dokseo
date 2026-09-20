import { captureId, imageIndex, type BookId, type CaptureId, type ImageIndex } from './ids';

export const IMAGE_PARAMETER = 'image';

export const FIND_PARAMETER = 'find';

export const CAPTURE_PARAMETER = 'capture';

export const MISSING_BOOK_PARAMETER = 'missing';

export const MISSING_BOOK_VALUE = 'book';

export const MISSING_BOOK_NOTICE = 'That book is no longer in your library.';

export const LIBRARY_AFTER_MISSING_BOOK = `/?${MISSING_BOOK_PARAMETER}=${MISSING_BOOK_VALUE}`;

export type ReaderArrival = {
  readonly capture: CaptureId;
  readonly query: string | null;
};

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

export function readerHref(
  book: BookId,
  index: ImageIndex,
  arrival: ReaderArrival | null = null,
): string {
  const place = `/read/${encodeURIComponent(book)}?${IMAGE_PARAMETER}=${index}`;
  if (arrival === null || arrival.capture.length === 0) return place;

  const found = `${CAPTURE_PARAMETER}=${encodeURIComponent(arrival.capture)}`;
  const query = arrival.query ?? '';
  if (query.trim().length === 0) return `${place}&${found}`;

  return `${place}&${FIND_PARAMETER}=${encodeURIComponent(query)}&${found}`;
}

export function readArrival(parameters: URLSearchParams): ReaderArrival | null {
  const found = parameters.get(CAPTURE_PARAMETER);
  if (found === null || found.length === 0) return null;

  const query = parameters.get(FIND_PARAMETER);
  const asked = query === null || query.trim().length === 0 ? null : query;

  return { capture: captureId(found), query: asked };
}

export function missingBookNotice(value: string | null | undefined): string | null {
  return value === MISSING_BOOK_VALUE ? MISSING_BOOK_NOTICE : null;
}
