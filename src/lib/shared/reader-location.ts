import { match } from 'ts-pattern';
import { imageIndex } from './ids';
import type { BookId, ImageIndex } from './ids';
import type { ReadingPlace } from './reading-place';

const IMAGE_PARAMETER = 'image';

const FIND_PARAMETER = 'find';

const CFI_PARAMETER = 'cfi';

const MISSING_BOOK_PARAMETER = 'missing';

const MISSING_BOOK_VALUE = 'book';

const MISSING_BOOK_NOTICE = 'That book is no longer in your library.';

const LIBRARY_AFTER_MISSING_BOOK = `/?${MISSING_BOOK_PARAMETER}=${MISSING_BOOK_VALUE}`;

type ReaderArrival =
  | { readonly kind: 'none' }
  | { readonly kind: 'image'; readonly index: ImageIndex; readonly query: string | null }
  | { readonly kind: 'passage'; readonly cfi: string; readonly query: string | null };

type MissingBookArrival = {
  readonly notice: string;
  readonly cleaned: URL;
};

type OpeningPlace = {
  readonly index: ImageIndex;
  readonly asked: boolean;
  readonly clamped: boolean;
};

const NO_ARRIVAL: ReaderArrival = { kind: 'none' };

const WHOLE_NUMBER = /^\d+$/;

function readImageIndex(value: string | null | undefined): ImageIndex | null {
  if (value === null || value === undefined) return null;

  const trimmed = value.trim();
  if (!WHOLE_NUMBER.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? imageIndex(parsed) : null;
}

function openingPlace(
  asked: ImageIndex | null,
  saved: ReadingPlace,
  imageCount: number,
): OpeningPlace | null {
  if (imageCount <= 0) return null;

  const last = imageCount - 1;
  const wanted = asked ?? (saved.kind === 'image' ? saved.index : null);
  if (wanted === null) return null;

  return {
    index: imageIndex(Math.min(Math.max(wanted, 0), last)),
    asked: asked !== null,
    clamped: asked !== null && asked > last,
  };
}

function urlWithImageIndex(url: URL, index: ImageIndex): URL | null {
  const moved = new URL(url);
  moved.searchParams.set(IMAGE_PARAMETER, String(index));
  return moved.href === url.href ? null : moved;
}

function searched(query: string | null): string | null {
  return query === null || query.trim().length === 0 ? null : query;
}

function withSearch(href: string, query: string | null): string {
  const asked = searched(query);
  if (asked === null) return href;

  return `${href}&${FIND_PARAMETER}=${encodeURIComponent(asked)}`;
}

function readerHref(book: BookId, index: ImageIndex, query: string | null = null): string {
  return withSearch(`/read/${encodeURIComponent(book)}?${IMAGE_PARAMETER}=${index}`, query);
}

function passageHref(book: BookId, cfi: string, query: string | null = null): string {
  const opened = `/read/${encodeURIComponent(book)}`;
  if (cfi.length === 0) return opened;

  return withSearch(`${opened}?${CFI_PARAMETER}=${encodeURIComponent(cfi)}`, query);
}

function readArrival(parameters: URLSearchParams): ReaderArrival {
  const query = searched(parameters.get(FIND_PARAMETER));

  const cfi = parameters.get(CFI_PARAMETER);
  if (cfi !== null && cfi.length > 0) return { kind: 'passage', cfi, query };

  const index = readImageIndex(parameters.get(IMAGE_PARAMETER));
  if (index !== null) return { kind: 'image', index, query };

  return NO_ARRIVAL;
}

function arrivalQuery(arrival: ReaderArrival): string | null {
  return match(arrival)
    .with({ kind: 'image' }, (image) => image.query)
    .with({ kind: 'passage' }, (passage) => passage.query)
    .with({ kind: 'none' }, () => null)
    .exhaustive();
}

function missingBookNotice(value: string | null | undefined): string | null {
  return value === MISSING_BOOK_VALUE ? MISSING_BOOK_NOTICE : null;
}

function missingBookArrival(url: URL): MissingBookArrival | null {
  const notice = missingBookNotice(url.searchParams.get(MISSING_BOOK_PARAMETER));
  if (notice === null) return null;

  const cleaned = new URL(url);
  cleaned.searchParams.delete(MISSING_BOOK_PARAMETER);
  return { notice, cleaned };
}

export {
  IMAGE_PARAMETER,
  FIND_PARAMETER,
  CFI_PARAMETER,
  NO_ARRIVAL,
  MISSING_BOOK_PARAMETER,
  MISSING_BOOK_VALUE,
  MISSING_BOOK_NOTICE,
  LIBRARY_AFTER_MISSING_BOOK,
  readImageIndex,
  openingPlace,
  urlWithImageIndex,
  readerHref,
  passageHref,
  readArrival,
  arrivalQuery,
  missingBookNotice,
  missingBookArrival,
};
export type { MissingBookArrival, ReaderArrival, OpeningPlace };
