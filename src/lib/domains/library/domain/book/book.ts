import { match } from 'ts-pattern';
import type { BookId, ImageIndex } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type { LayoutKind, PagePairing, ReadingDirection } from '$lib/shared/layout-kind';
import type { PageFit } from '$lib/shared/page-fit';

type SourceKind = 'images' | 'pdf' | 'archive';

type Book = {
  readonly id: BookId;
  readonly title: string;
  readonly language: Language;
  readonly layoutKind: LayoutKind;
  readonly direction: ReadingDirection;
  readonly pagePairing: PagePairing;
  readonly pageFit: PageFit;
  readonly sourceKind: SourceKind;
  readonly imageCount: number;
  readonly addedAt: number;
  readonly position: ImageIndex;
};

const DEFAULT_PAGE_PAIRING: PagePairing = 'double-after-cover';

function defaultPageFit(layoutKind: LayoutKind): PageFit {
  return match(layoutKind)
    .with('continuous', () => 'width' as const)
    .with('paged', () => 'height' as const)
    .exhaustive();
}

type BookEdit = {
  readonly title?: string;
  readonly language?: Language;
  readonly layoutKind?: LayoutKind;
  readonly direction?: ReadingDirection;
  readonly pagePairing?: PagePairing;
  readonly pageFit?: PageFit;
  readonly position?: ImageIndex;
};

function editedTitle(book: Book, edit: BookEdit): string {
  if (edit.title === undefined) return book.title;
  const trimmed = edit.title.trim();
  return trimmed.length === 0 ? book.title : trimmed;
}

function applyEdit(book: Book, edit: BookEdit): Book {
  const layoutKind = edit.layoutKind ?? book.layoutKind;
  const pageFit = layoutKind === 'continuous' ? 'width' : (edit.pageFit ?? book.pageFit);
  return {
    ...book,
    title: editedTitle(book, edit),
    language: edit.language ?? book.language,
    layoutKind,
    direction: edit.direction ?? book.direction,
    pagePairing: edit.pagePairing ?? book.pagePairing,
    pageFit,
    position: edit.position ?? book.position,
  };
}

export { DEFAULT_PAGE_PAIRING, defaultPageFit, applyEdit };
export type { SourceKind, Book, BookEdit };
