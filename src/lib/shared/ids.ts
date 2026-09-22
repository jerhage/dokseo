declare const brand: unique symbol;

type Branded<T, B extends string> = T & { readonly [brand]: B };

type BookId = Branded<string, 'BookId'>;

type CaptureId = Branded<string, 'CaptureId'>;

type TagId = Branded<string, 'TagId'>;

type ImageIndex = Branded<number, 'ImageIndex'>;

type ContentHash = Branded<string, 'ContentHash'>;

function bookId(value: string): BookId {
  return value as BookId;
}

function captureId(value: string): CaptureId {
  return value as CaptureId;
}

function tagId(value: string): TagId {
  return value as TagId;
}

function imageIndex(value: number): ImageIndex {
  return value as ImageIndex;
}

function contentHash(value: string): ContentHash {
  return value as ContentHash;
}

export { bookId, captureId, tagId, imageIndex, contentHash };
export type { BookId, CaptureId, TagId, ImageIndex, ContentHash };
