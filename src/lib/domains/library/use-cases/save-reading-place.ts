import type { BookId } from '$lib/shared/ids';
import type { ReadingPlace } from '$lib/shared/reading-place';
import type { StorageUnavailable } from '$lib/shared/storage-unavailable';
import type { Book } from '../domain/book/book';
import type { LibraryRepository } from '../domain/book/library-repository';

type SaveReadingPlaceResult =
  | { readonly kind: 'success'; readonly book: Book }
  | { readonly kind: 'not-found'; readonly id: BookId }
  | StorageUnavailable;

type SaveReadingPlaceDeps = {
  readonly repository: LibraryRepository;
  readonly now: () => number;
};

async function saveReadingPlace(
  deps: SaveReadingPlaceDeps,
  id: BookId,
  place: ReadingPlace,
): Promise<SaveReadingPlaceResult> {
  const updated = await deps.repository.update(id, { position: place, lastReadAt: deps.now() });
  if (updated.kind !== 'success') return updated;
  if (updated.book === null) return { kind: 'not-found', id };
  return { kind: 'success', book: updated.book };
}

export { saveReadingPlace };
export type { SaveReadingPlaceDeps, SaveReadingPlaceResult };
