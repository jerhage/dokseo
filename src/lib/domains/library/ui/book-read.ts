import { match } from 'ts-pattern';
import { imageLayoutKind } from '$lib/shared/layout-kind';
import type { ReadState } from '$lib/shared/read-state';
import type { Book } from '../domain/book/book';
import type { BookAnswer } from '../queries/library-queries';

type BookRead =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'missing' }
  | { readonly kind: 'ready'; readonly book: Book };

const BOOK_LOADING: BookRead = { kind: 'loading' };

const NO_BOOK: BookRead = { kind: 'missing' };

function bookReadOf(state: ReadState<BookAnswer>): BookRead {
  return match(state)
    .with({ kind: 'loading' }, () => BOOK_LOADING)
    .with({ kind: 'failed' }, (failed): BookRead => failed)
    .with({ kind: 'ready', value: { kind: 'missing' } }, () => NO_BOOK)
    .with({ kind: 'ready', value: { kind: 'found' } }, ({ value }): BookRead => ({
      kind: 'ready',
      book: value.book,
    }))
    .exhaustive();
}

function flowingBook(read: BookRead): Book | null {
  return match(read)
    .with({ kind: 'ready' }, ({ book }) =>
      imageLayoutKind(book.layoutKind) === null ? book : null,
    )
    .with({ kind: 'loading' }, { kind: 'failed' }, { kind: 'missing' }, () => null)
    .exhaustive();
}

export { bookReadOf, flowingBook };
export type { BookRead };
