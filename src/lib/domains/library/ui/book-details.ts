import type { BookId } from '$lib/shared/ids';
import { shownTitle } from '$lib/shared/shown-title';
import type { Language } from '$lib/shared/language';
import type { Book } from '../domain/book/book';
import { bookProgress } from '../domain/book/book-progress';
import { bookFacts, readingState } from './library-shelves';

type BookDetailsProgress =
  | { readonly kind: 'finished' }
  | { readonly kind: 'known'; readonly label: string; readonly filled: number }
  | { readonly kind: 'unknown' };

type BookAction = 'finish' | 'unread' | 'edit' | 'remove';

type BookDetails = {
  readonly title: string;
  readonly language: Language;
  readonly facts: string;
  readonly progress: BookDetailsProgress;
  readonly readLabel: string;
  readonly actions: readonly BookAction[];
};

type OpenedBook = { readonly book: Book; readonly details: BookDetails };

function detailsProgress(book: Book): BookDetailsProgress {
  if (book.finishedAt !== null) return { kind: 'finished' };
  return bookProgress(book);
}

function bookActions(book: Book): readonly BookAction[] {
  const reading = readingState(book);
  return [
    ...(reading === 'finished' ? [] : (['finish'] as const)),
    ...(reading === 'unread' ? [] : (['unread'] as const)),
    'edit',
    'remove',
  ];
}

function bookDetails(book: Book): BookDetails {
  const progress = detailsProgress(book);
  return {
    title: shownTitle(book),
    language: book.language,
    facts: bookFacts(book),
    progress,
    readLabel: readingState(book) === 'reading' ? 'Continue reading' : 'Read',
    actions: bookActions(book),
  };
}

function openedBook(books: readonly Book[], openId: BookId | null): OpenedBook | null {
  const book = books.find((candidate) => candidate.id === openId);
  return book === undefined ? null : { book, details: bookDetails(book) };
}

export { bookActions, bookDetails, openedBook };
export type { BookAction, BookDetails, BookDetailsProgress, OpenedBook };
