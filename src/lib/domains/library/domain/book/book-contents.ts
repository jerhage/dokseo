import { match } from 'ts-pattern';
import { imageLayoutKind } from '$lib/shared/layout-kind';
import type { Book } from './book';

type BookContents =
  | { readonly kind: 'images'; readonly imageCount: number }
  | { readonly kind: 'flowing-text' };

type LibraryContents =
  | { readonly kind: 'empty' }
  | { readonly kind: 'images'; readonly bookCount: number; readonly imageCount: number }
  | { readonly kind: 'flowing'; readonly bookCount: number }
  | {
      readonly kind: 'mixed';
      readonly imageBooks: number;
      readonly imageCount: number;
      readonly flowingBooks: number;
    };

const FLOWING_TEXT: BookContents = { kind: 'flowing-text' };

function bookContents(book: Book): BookContents {
  if (imageLayoutKind(book.layoutKind) === null) return FLOWING_TEXT;
  return { kind: 'images', imageCount: book.imageCount };
}

function counted(count: number, noun: string): string {
  return `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;
}

function describeBookContents(contents: BookContents): string {
  if (contents.kind === 'flowing-text') return 'Flowing text';
  return counted(contents.imageCount, 'image');
}

function flowing(book: Book): boolean {
  return bookContents(book).kind === 'flowing-text';
}

function libraryContents(books: readonly Book[]): LibraryContents {
  if (books.length === 0) return { kind: 'empty' };

  const flowingBooks = books.filter(flowing).length;
  const imageBooks = books.length - flowingBooks;
  const imageCount = books
    .filter((book) => !flowing(book))
    .reduce((sum, book) => sum + book.imageCount, 0);

  if (flowingBooks === 0) return { kind: 'images', bookCount: imageBooks, imageCount };
  if (imageBooks === 0) return { kind: 'flowing', bookCount: flowingBooks };
  return { kind: 'mixed', imageBooks, imageCount, flowingBooks };
}

function describeLibraryContents(contents: LibraryContents): string {
  return match(contents)
    .with({ kind: 'empty' }, () => counted(0, 'book'))
    .with(
      { kind: 'images' },
      (only) => `${counted(only.bookCount, 'book')} · ${counted(only.imageCount, 'image')}`,
    )
    .with({ kind: 'flowing' }, (only) => `${counted(only.bookCount, 'book')} · flowing text`)
    .with(
      { kind: 'mixed' },
      (both) =>
        `${counted(both.imageBooks + both.flowingBooks, 'book')} · ` +
        `${counted(both.imageCount, 'image')} across ${both.imageBooks} · ` +
        `${counted(both.flowingBooks, 'flowing text')}`,
    )
    .exhaustive();
}

export { bookContents, describeBookContents, describeLibraryContents, libraryContents };
export type { BookContents, LibraryContents };
