import type { BookId, CaptureId } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Capture } from './capture';

export type CaptureError =
  | { readonly kind: 'storage-unavailable' }
  | { readonly kind: 'storage-failed'; readonly cause: string };

export interface CaptureRepository {
  listForBook(book: BookId): Promise<Result<readonly Capture[], CaptureError>>;
  listEverything(): Promise<Result<readonly Capture[], CaptureError>>;
  save(capture: Capture): Promise<Result<void, CaptureError>>;
  remove(capture: CaptureId): Promise<Result<void, CaptureError>>;
  clearBook(book: BookId): Promise<Result<void, CaptureError>>;
}
