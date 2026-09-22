import { contentHash } from '$lib/shared/ids';
import type { ContentHash, ImageIndex } from '$lib/shared/ids';
import type { PagePairing } from '$lib/shared/layout-kind';
import type { PageFit } from '$lib/shared/page-fit';
import { imagePlace } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';
import { defaultPageFit, DEFAULT_PAGE_PAIRING } from './book';
import type { Book } from './book';

const NO_CONTENT_HASH = contentHash('');

type StoredBook = Omit<Book, 'pagePairing' | 'pageFit' | 'position' | 'contentHash'> & {
  readonly pagePairing?: PagePairing;
  readonly pageFit?: PageFit;
  readonly position: ImageIndex | ReadingPlace;
  readonly contentHash?: ContentHash;
};

function storedPlace(position: ImageIndex | ReadingPlace): ReadingPlace {
  return typeof position === 'number' ? imagePlace(position) : position;
}

function bookFromStored(stored: StoredBook): Book {
  return {
    ...stored,
    pagePairing: stored.pagePairing ?? DEFAULT_PAGE_PAIRING,
    pageFit: stored.pageFit ?? defaultPageFit(stored.layoutKind),
    position: storedPlace(stored.position),
    contentHash: stored.contentHash ?? NO_CONTENT_HASH,
  };
}

export { NO_CONTENT_HASH, bookFromStored };
export type { StoredBook };
