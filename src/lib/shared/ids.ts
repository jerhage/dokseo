declare const brand: unique symbol;

type Branded<T, B extends string> = T & { readonly [brand]: B };

export type BookId = Branded<string, 'BookId'>;

export type CaptureId = Branded<string, 'CaptureId'>;

export type ImageIndex = Branded<number, 'ImageIndex'>;

export function bookId(value: string): BookId {
	return value as BookId;
}

export function captureId(value: string): CaptureId {
	return value as CaptureId;
}

export function imageIndex(value: number): ImageIndex {
	return value as ImageIndex;
}
