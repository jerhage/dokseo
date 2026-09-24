import type { BookId } from '$lib/shared/ids';
import type { ReadingPlace } from '$lib/shared/reading-place';
import type { Result } from '$lib/shared/result';
import type { Book } from '../domain/book/book';
import type { LibraryError, LibraryRepository } from '../domain/book/library-repository';

type SaveReadingPlaceDeps = {
  readonly repository: LibraryRepository;
  readonly now: () => number;
};

function saveReadingPlace(
  deps: SaveReadingPlaceDeps,
  id: BookId,
  place: ReadingPlace,
): Promise<Result<Book, LibraryError>> {
  return deps.repository.update(id, { position: place, lastReadAt: deps.now() });
}

export { saveReadingPlace };
export type { SaveReadingPlaceDeps };
