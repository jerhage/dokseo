declare const brand: unique symbol;

type Branded<T, B extends string> = T & { readonly [brand]: B };

type BookId = Branded<string, 'BookId'>;

type CaptureId = Branded<string, 'CaptureId'>;

type TagId = Branded<string, 'TagId'>;

type SeriesId = Branded<string, 'SeriesId'>;

type ImageIndex = Branded<number, 'ImageIndex'>;

type ContentHash = Branded<string, 'ContentHash'>;

function bookId(value: string): BookId {
  return value as BookId;
}

function parsedBookId(raw: string): BookId | null {
  const flat = raw.length > 0 && !raw.includes('/') && !raw.includes('\\') && !raw.includes('..');
  return flat ? bookId(raw) : null;
}

function captureId(value: string): CaptureId {
  return value as CaptureId;
}

function tagId(value: string): TagId {
  return value as TagId;
}

function seriesId(value: string): SeriesId {
  return value as SeriesId;
}

function imageIndex(value: number): ImageIndex {
  return value as ImageIndex;
}

function contentHash(value: string): ContentHash {
  return value as ContentHash;
}

export { bookId, parsedBookId, captureId, tagId, seriesId, imageIndex, contentHash };
export type { BookId, CaptureId, TagId, SeriesId, ImageIndex, ContentHash };
