import type { PagePairing } from '$lib/shared/layout-kind';
import type { Book } from './book';

export type StoredBook = Omit<Book, 'pagePairing'> & { readonly pagePairing?: PagePairing };

export function bookFromStored(stored: StoredBook): Book {
  return { ...stored, pagePairing: stored.pagePairing ?? 'single' };
}
