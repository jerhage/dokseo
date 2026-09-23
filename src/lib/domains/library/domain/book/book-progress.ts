import type { ImageIndex } from '$lib/shared/ids';
import type { Book } from './book';

type BookProgress =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'known'; readonly label: string; readonly filled: number };

const HOW_FAR_IS_NOT_KNOWN: BookProgress = { kind: 'unknown' };

const PAGE_LABEL_DIGITS = 3;

function pagesRead(book: Book, index: ImageIndex): BookProgress {
  const total = Math.max(book.imageCount, 1);
  const page = Math.min(index + 1, total);
  const label =
    book.layoutKind === 'continuous'
      ? `${page} / ${book.imageCount} images`
      : `p.${String(page).padStart(PAGE_LABEL_DIGITS, '0')} / ${book.imageCount}`;

  return { kind: 'known', label, filled: (page / total) * 100 };
}

function textRead(fraction: number | null): BookProgress {
  if (fraction === null) return HOW_FAR_IS_NOT_KNOWN;

  const filled = fraction * 100;
  return { kind: 'known', label: `${Math.round(filled)}%`, filled };
}

function bookProgress(book: Book): BookProgress {
  const place = book.position;
  if (place.kind === 'image') return pagesRead(book, place.index);

  return textRead(place.fraction);
}

export { bookProgress };
export type { BookProgress };
