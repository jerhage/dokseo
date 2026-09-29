import { match } from 'ts-pattern';
import { imageRect } from './geometry';
import type { ImageRect } from './geometry';
import { imageIndex } from './ids';
import type { BookId, ImageIndex } from './ids';
import type { ImageRegion } from './image-region';
import type { ReadingPlace } from './reading-place';

const IMAGE_PARAMETER = 'image';

const FIND_PARAMETER = 'find';

const REGION_PARAMETER = 'region';

const REGION_DECIMALS = 2;

const REGION_TOLERANCE = 0.01;

const CFI_PARAMETER = 'cfi';

const MISSING_BOOK_PARAMETER = 'missing';

const MISSING_BOOK_VALUE = 'book';

const MISSING_BOOK_NOTICE = 'That book is no longer in your library.';

const LIBRARY_AFTER_MISSING_BOOK = `/?${MISSING_BOOK_PARAMETER}=${MISSING_BOOK_VALUE}`;

type ReaderArrival =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'image';
      readonly index: ImageIndex;
      readonly region: ImageRect | null;
      readonly query: string | null;
    }
  | { readonly kind: 'passage'; readonly cfi: string; readonly query: string | null };

type MissingBookArrival = {
  readonly notice: string;
  readonly cleaned: URL;
};

type ShownPlace =
  | { readonly kind: 'arrived'; readonly index: ImageIndex }
  | { readonly kind: 'moved'; readonly index: ImageIndex; readonly group: readonly ImageIndex[] };

type OpeningPlace = {
  readonly index: ImageIndex;
  readonly asked: boolean;
  readonly clamped: boolean;
};

const NO_ARRIVAL: ReaderArrival = { kind: 'none' };

const WHOLE_NUMBER = /^\d+$/;

const COORDINATE = /^\d+(\.\d+)?$/;

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

function urlForShownPlace(url: URL, place: ShownPlace): URL | null {
  if (place.kind === 'arrived') return urlWithImageIndex(url, place.index);

  const named = readImageIndex(url.searchParams.get(IMAGE_PARAMETER));
  if (named !== null && place.group.includes(named)) return null;

  const moved = new URL(url);
  moved.searchParams.set(IMAGE_PARAMETER, String(place.index));
  moved.searchParams.delete(REGION_PARAMETER);
  moved.searchParams.delete(FIND_PARAMETER);
  return moved.href === url.href ? null : moved;
}

function regionCoordinate(value: number): string {
  return String(Number(value.toFixed(REGION_DECIMALS)));
}

function regionValue(rect: ImageRect): string {
  return [rect.x, rect.y, rect.width, rect.height].map(regionCoordinate).join(',');
}

function readCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (!COORDINATE.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRegion(value: string | null | undefined): ImageRect | null {
  if (value === null || value === undefined) return null;

  const parts = value.split(',');
  if (parts.length !== 4) return null;

  const [x = null, y = null, width = null, height = null] = parts.map(readCoordinate);
  if (x === null || y === null || width === null || height === null) return null;

  return imageRect(x, y, width, height);
}

function regionDistance(named: ImageRect, stored: ImageRect): number {
  return Math.max(
    Math.abs(named.x - stored.x),
    Math.abs(named.y - stored.y),
    Math.abs(named.width - stored.width),
    Math.abs(named.height - stored.height),
  );
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

function captureHref(book: BookId, region: ImageRegion, query: string | null = null): string {
  const place = `/read/${encodeURIComponent(book)}?${IMAGE_PARAMETER}=${region.index}`;
  return withSearch(`${place}&${REGION_PARAMETER}=${regionValue(region.rect)}`, query);
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
  if (index === null) return NO_ARRIVAL;

  const region = readRegion(parameters.get(REGION_PARAMETER));
  return { kind: 'image', index, region, query };
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
  REGION_PARAMETER,
  REGION_TOLERANCE,
  CFI_PARAMETER,
  NO_ARRIVAL,
  MISSING_BOOK_PARAMETER,
  MISSING_BOOK_VALUE,
  MISSING_BOOK_NOTICE,
  LIBRARY_AFTER_MISSING_BOOK,
  readImageIndex,
  openingPlace,
  urlWithImageIndex,
  urlForShownPlace,
  readerHref,
  captureHref,
  passageHref,
  readRegion,
  regionDistance,
  readArrival,
  arrivalQuery,
  missingBookNotice,
  missingBookArrival,
};
export type { MissingBookArrival, ReaderArrival, OpeningPlace, ShownPlace };
