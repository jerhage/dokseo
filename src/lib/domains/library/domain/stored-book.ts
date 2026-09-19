import type { PagePairing } from '$lib/shared/layout-kind';
import { DEFAULT_PAGE_PAIRING, type Book } from './book';

export type StoredBook = Omit<Book, 'pagePairing'> & { readonly pagePairing?: PagePairing };

export function bookFromStored(stored: StoredBook): Book {
  return { ...stored, pagePairing: stored.pagePairing ?? DEFAULT_PAGE_PAIRING };
}
