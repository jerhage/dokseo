import { match } from 'ts-pattern';
import { imageIndex } from '$lib/shared/ids';
import type { BookId, ContentHash } from '$lib/shared/ids';
import type { Language } from '$lib/shared/language';
import type {
  ImageLayoutKind,
  LayoutKind,
  PagePairing,
  ReadingDirection,
} from '$lib/shared/layout-kind';
import type { PageFit } from '$lib/shared/page-fit';
import { imagePlace, START_OF_THE_TEXT } from '$lib/shared/reading-place';
import type { ReadingPlace } from '$lib/shared/reading-place';

type SourceKind = 'images' | 'pdf' | 'archive' | 'epub';

type Book = {
  readonly id: BookId;
  readonly title: string;
  readonly language: Language;
  readonly layoutKind: LayoutKind;
  readonly direction: ReadingDirection;
  readonly pagePairing: PagePairing;
  readonly pageFit: PageFit;
  readonly sourceKind: SourceKind;
  readonly contentHash: ContentHash;
  readonly imageCount: number;
  readonly addedAt: number;
  readonly position: ReadingPlace;
  readonly lastReadAt: number | null;
  readonly finishedAt: number | null;
};

const DEFAULT_PAGE_PAIRING: PagePairing = 'double-after-cover';

const PAGE_FIT_A_FLOW_BOOK_NEVER_READS: PageFit = 'width';

function defaultPageFit(layoutKind: LayoutKind): PageFit {
  return match(layoutKind)
    .with('continuous', () => 'width' as const)
    .with('paged', () => 'height' as const)
    .with('flow', () => PAGE_FIT_A_FLOW_BOOK_NEVER_READS)
    .exhaustive();
}

type BookEdit = {
  readonly title?: string;
  readonly language?: Language;
  readonly layoutKind?: ImageLayoutKind;
  readonly direction?: ReadingDirection;
  readonly pagePairing?: PagePairing;
  readonly pageFit?: PageFit;
  readonly position?: ReadingPlace;
  readonly lastReadAt?: number;
  readonly finishedAt?: number | null;
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
    lastReadAt: edit.lastReadAt ?? book.lastReadAt,
    finishedAt: edit.finishedAt === undefined ? book.finishedAt : edit.finishedAt,
  };
}

function startingPlace(book: Book): ReadingPlace {
  return match(book.layoutKind)
    .with('paged', 'continuous', () => imagePlace(imageIndex(0)))
    .with('flow', () => START_OF_THE_TEXT)
    .exhaustive();
}

export { DEFAULT_PAGE_PAIRING, defaultPageFit, applyEdit, startingPlace };
export type { SourceKind, Book, BookEdit };
