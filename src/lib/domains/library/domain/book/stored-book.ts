import type { PagePairing } from '$lib/shared/layout-kind';
import type { PageFit } from '$lib/shared/page-fit';
import { defaultPageFit, DEFAULT_PAGE_PAIRING, type Book } from './book';

export type StoredBook = Omit<Book, 'pagePairing' | 'pageFit'> & {
  readonly pagePairing?: PagePairing;
  readonly pageFit?: PageFit;
};

export function bookFromStored(stored: StoredBook): Book {
  return {
    ...stored,
    pagePairing: stored.pagePairing ?? DEFAULT_PAGE_PAIRING,
    pageFit: stored.pageFit ?? defaultPageFit(stored.layoutKind),
  };
}
