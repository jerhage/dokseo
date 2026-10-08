import { imageIndex } from '$lib/shared/ids';
import type { ContentHash } from '$lib/shared/ids';
import type { LayoutKind } from '$lib/shared/layout-kind';
import { imagePlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { defaultPageFit, placeToStart } from './book';
import type { Book, SourceKind } from './book';

type ReplacementFile = {
  readonly sourceKind: SourceKind;
  readonly contentHash: ContentHash;
  readonly fileName: string;
  readonly layoutKind: LayoutKind;
  readonly imageCount: number;
};

const FIRST_IMAGE = 0;

function placeWithinPages(place: ReadingPlace, imageCount: number): ReadingPlace {
  if (place.kind !== 'image') return place;

  const last = imageIndex(Math.max(FIRST_IMAGE, imageCount - 1));
  if (place.shownThrough <= last) return place;

  return imagePlace(place.index <= last ? place.index : last, last, place.offset);
}

function sameFamily(one: LayoutKind, other: LayoutKind): boolean {
  return (one === 'flow') === (other === 'flow');
}

function replacedFile(book: Book, file: ReplacementFile): Book {
  const family = sameFamily(book.layoutKind, file.layoutKind);
  const layoutKind = family ? book.layoutKind : file.layoutKind;

  return {
    ...book,
    layoutKind,
    pageFit: family ? book.pageFit : defaultPageFit(layoutKind),
    sourceKind: file.sourceKind,
    contentHash: file.contentHash,
    fileName: file.fileName,
    imageCount: file.imageCount,
    position: family ? placeWithinPages(book.position, file.imageCount) : placeToStart(layoutKind),
  };
}

export { replacedFile };
export type { ReplacementFile };
