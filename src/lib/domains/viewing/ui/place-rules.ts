import type { ImageIndex } from '$lib/shared/ids';
import { imageLayoutKind } from '$lib/shared/layout-kind';
import { readingStarted, samePlace, showsTheEnd } from '$lib/shared/reading-place';
import type { ImagePlace, ReadingPlace } from '$lib/shared/reading-place';
import type { ReaderBook } from './reader-opening';

function opensOnAnUnreadEnd(book: ReaderBook, saved: ReadingPlace, showing: ImagePlace): boolean {
  if (imageLayoutKind(book.layoutKind) !== 'paged' || saved.kind !== 'image') return false;
  if (!showsTheEnd(showing, book.imageCount)) return false;
  const recorded =
    samePlace(saved, showing) && readingStarted(saved, book.imageCount, book.lastReadAt);
  return !recorded;
}

function shownThroughCurrent(
  book: ReaderBook,
  recorded: ImagePlace | null,
  at: ImageIndex,
  showing: ImagePlace,
): ImagePlace | null {
  if (imageLayoutKind(book.layoutKind) !== 'paged') return null;
  if (recorded === null || recorded.index !== at) return null;
  if (samePlace(showing, recorded)) return null;

  const readingAt = (place: ImagePlace): boolean =>
    place.index !== 0 || showsTheEnd(place, book.imageCount);
  return readingAt(showing) || readingAt(recorded) ? showing : null;
}

export { opensOnAnUnreadEnd, shownThroughCurrent };
