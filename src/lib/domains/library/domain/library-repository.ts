import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { Result } from '$lib/shared/result';
import type { Book } from './book';

export type LibraryError =
	| { readonly kind: 'not-found'; readonly id: BookId }
	| { readonly kind: 'storage-unavailable' }
	| { readonly kind: 'storage-failed'; readonly cause: string };

export interface LibraryRepository {
	list(): Promise<Result<readonly Book[], LibraryError>>;
	get(id: BookId): Promise<Result<Book, LibraryError>>;
	add(book: Book, source: Blob, cover: Blob): Promise<Result<void, LibraryError>>;
	remove(id: BookId): Promise<Result<void, LibraryError>>;
	savePosition(id: BookId, at: ImageIndex): Promise<Result<void, LibraryError>>;
	readSource(id: BookId): Promise<Result<Blob, LibraryError>>;
	readCover(id: BookId): Promise<Result<Blob, LibraryError>>;
}
