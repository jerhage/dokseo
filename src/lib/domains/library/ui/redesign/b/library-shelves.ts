import { match } from 'ts-pattern';
import { effectiveDirection } from '$lib/shared/layout-kind';
import { resumedCfi } from '$lib/shared/reading-place';
import type { TabItem } from '$lib/components/tabs';
import type { Book, SourceKind } from '../../../domain/book/book';
import { bookContents, describeBookContents } from '../../../domain/book/book-contents';
import { bookProgress } from '../../../domain/book/book-progress';

type ReadingState = 'unread' | 'reading' | 'finished';

type Shelf = 'all' | ReadingState;

type SortOrder = 'added' | 'title' | 'progress';

type CollectionView = 'grid' | 'list';

const SHELVES: readonly Shelf[] = ['all', 'reading', 'unread', 'finished'];

const SORT_ORDERS: readonly SortOrder[] = ['added', 'title', 'progress'];

const CONTINUE_LIMIT = 3;

const TITLE_ORDER = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function readingState(book: Book): ReadingState {
  const place = book.position;
  if (place.kind === 'image') {
    if (place.index === 0) return 'unread';
    return place.index >= book.imageCount - 1 ? 'finished' : 'reading';
  }
  if (resumedCfi(place) === null) return 'unread';
  return place.fraction !== null && place.fraction >= 1 ? 'finished' : 'reading';
}

function onShelf(book: Book, shelf: Shelf): boolean {
  return shelf === 'all' || readingState(book) === shelf;
}

function shelfBooks(books: readonly Book[], shelf: Shelf): readonly Book[] {
  return books.filter((book) => onShelf(book, shelf));
}

function shelfName(shelf: Shelf): string {
  return match(shelf)
    .with('all', () => 'All')
    .with('reading', () => 'Reading')
    .with('unread', () => 'Not started')
    .with('finished', () => 'Finished')
    .exhaustive();
}

function shelfTabs(books: readonly Book[]): readonly TabItem[] {
  return SHELVES.map((shelf) => ({
    id: shelf,
    label: `${shelfName(shelf)} ${shelfBooks(books, shelf).length}`,
  }));
}

function toShelf(id: string | undefined): Shelf {
  return SHELVES.find((shelf) => shelf === id) ?? 'all';
}

function sortName(order: SortOrder): string {
  return match(order)
    .with('added', () => 'Recently added')
    .with('title', () => 'Title')
    .with('progress', () => 'Most read')
    .exhaustive();
}

function readPercent(book: Book): number {
  const progress = bookProgress(book);
  return progress.kind === 'known' ? progress.filled : 0;
}

function sortBooks(books: readonly Book[], order: SortOrder): readonly Book[] {
  return match(order)
    .with('added', () => books)
    .with('title', () => books.toSorted((a, b) => TITLE_ORDER.compare(a.title, b.title)))
    .with('progress', () => books.toSorted((a, b) => readPercent(b) - readPercent(a)))
    .exhaustive();
}

function continueReading(books: readonly Book[]): readonly Book[] {
  return shelfBooks(books, 'reading').slice(0, CONTINUE_LIMIT);
}

function sourceName(sourceKind: SourceKind): string {
  return match(sourceKind)
    .with('images', () => 'Images')
    .with('pdf', () => 'PDF')
    .with('archive', () => 'Archive')
    .with('epub', () => 'EPUB')
    .exhaustive();
}

function flowName(book: Book): string {
  if (book.layoutKind === 'continuous') return 'Top to bottom';
  return effectiveDirection(book.direction, book.layoutKind) === 'rtl'
    ? 'Right to left'
    : 'Left to right';
}

function bookFacts(book: Book): string {
  return [
    sourceName(book.sourceKind),
    flowName(book),
    describeBookContents(bookContents(book)),
  ].join(' · ');
}

function emptyShelfText(shelf: Shelf, searching: boolean): string {
  if (searching) return 'No title on this shelf matches.';
  return match(shelf)
    .with('all', () => 'Nothing here yet.')
    .with('reading', () => 'Nothing in progress. Open a book to start it.')
    .with('unread', () => 'Every book has been started.')
    .with('finished', () => 'No finished books yet.')
    .exhaustive();
}

export {
  CONTINUE_LIMIT,
  SHELVES,
  SORT_ORDERS,
  bookFacts,
  continueReading,
  emptyShelfText,
  readingState,
  shelfBooks,
  shelfName,
  shelfTabs,
  sortBooks,
  sortName,
  toShelf,
};
export type { CollectionView, ReadingState, Shelf, SortOrder };
