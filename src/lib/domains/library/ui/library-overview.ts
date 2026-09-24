import { matchesQuery } from '$lib/shared/text-search';
import type { Book } from '../domain/book/book';
import { describeLibraryContents, libraryContents } from '../domain/book/book-contents';
import type { LibraryStatus } from './library-view.svelte';

type LibraryBody = 'reading' | 'failed' | 'empty' | 'listed';

const SOURCE_URL = 'https://github.com/jerhage/dokseo';

const SOURCE_LABEL = 'The source of this app, on GitHub';

const GITHUB_MARK =
  'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 ' +
  '0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 ' +
  '17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 ' +
  '1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465' +
  '-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 ' +
  '3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 ' +
  '3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 ' +
  '1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627' +
  '-5.373-12-12-12';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

function formatBytes(bytes: number): string {
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit > 0 && size < 10 ? 1 : 0)} ${UNITS[unit]}`;
}

function storageText(storedBytes: number | null): string {
  return storedBytes === null ? 'upload size unknown' : `${formatBytes(storedBytes)} of uploads`;
}

function librarySummary(books: readonly Book[], storedBytes: number | null): string {
  return `${describeLibraryContents(libraryContents(books))} · ${storageText(storedBytes)}`;
}

function isSearching(query: string): boolean {
  return query.trim().length > 0;
}

function titledBooks(books: readonly Book[], query: string): readonly Book[] {
  return isSearching(query) ? books.filter((book) => matchesQuery(book.title, query)) : books;
}

function matchedText(count: number): string {
  return `${count} ${count === 1 ? 'title' : 'titles'}`;
}

function clearsSearch(key: string, query: string): boolean {
  return key === 'Escape' && query.length > 0;
}

function libraryBody(status: LibraryStatus, bookCount: number, importing: boolean): LibraryBody {
  const settling = status !== 'ready' && status !== 'failed';
  const nothing = bookCount === 0 && !importing;
  if (settling && nothing) return 'reading';
  if (status === 'failed') return 'failed';
  if (nothing) return 'empty';
  return 'listed';
}

export {
  GITHUB_MARK,
  SOURCE_LABEL,
  SOURCE_URL,
  clearsSearch,
  formatBytes,
  isSearching,
  libraryBody,
  librarySummary,
  matchedText,
  storageText,
  titledBooks,
};
export type { LibraryBody };
