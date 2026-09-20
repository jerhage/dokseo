declare const brand: unique symbol;

type Branded<T, B extends string> = T & { readonly [brand]: B };

type BookId = Branded<string, 'BookId'>;

type CaptureId = Branded<string, 'CaptureId'>;

type ImageIndex = Branded<number, 'ImageIndex'>;

function bookId(value: string): BookId {
  return value as BookId;
}

function captureId(value: string): CaptureId {
  return value as CaptureId;
}

function imageIndex(value: number): ImageIndex {
  return value as ImageIndex;
}

export { bookId, captureId, imageIndex };
export type { BookId, CaptureId, ImageIndex };
