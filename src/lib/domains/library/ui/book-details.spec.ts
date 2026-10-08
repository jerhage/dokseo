import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace, START_OF_THE_TEXT } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import { BookDetailsView } from './book-details.svelte';
import { bookActions, bookDetails } from './book-details';
import { bookFacts } from './library-shelves';

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: bookId('one'),
    title: 'Blame! 1',
    alias: null,
    seriesId: null,
    volume: null,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount: 100,
    addedAt: 1,
    position: imagePlace(imageIndex(39)),
    lastReadAt: 5,
    finishedAt: null,
    ...overrides,
  };
}

describe('bookDetails', () => {
  it('lists the title, language and the facts of the card', () => {
    const details = bookDetails(book({ alias: 'Mine' }));

    expect(details.title).toBe('Mine');
    expect(details.language).toBe('ja');
    expect(details.facts).toBe(bookFacts(book()));
  });

  it('reports the progress label and offers to continue reading a book in progress', () => {
    const details = bookDetails(book());

    expect(details.progress).toEqual({ kind: 'known', label: 'p.040 / 100', filled: 40 });
    expect(details.readLabel).toBe('Continue reading');
  });

  it('offers Read for a book not started although its first page is known', () => {
    const fresh = bookDetails(book({ position: imagePlace(imageIndex(0)), lastReadAt: null }));

    expect(fresh.progress.kind).toBe('known');
    expect(fresh.readLabel).toBe('Read');
  });

  it('reports unknown progress and offers Read for a text book with no fraction', () => {
    const details = bookDetails(
      book({ layoutKind: 'flow', sourceKind: 'epub', position: START_OF_THE_TEXT }),
    );

    expect(details.progress).toEqual({ kind: 'unknown' });
    expect(details.readLabel).toBe('Read');
  });

  it('reports a finished book as finished and offers Read', () => {
    const details = bookDetails(book({ finishedAt: 9 }));

    expect(details.progress).toEqual({ kind: 'finished' });
    expect(details.readLabel).toBe('Read');
  });
});

describe('bookActions', () => {
  it('offers both marks, settings and removal for a book in progress', () => {
    expect(bookActions(book())).toEqual(['finish', 'unread', 'edit', 'remove']);
  });

  it('leaves out Mark as finished for a finished book', () => {
    expect(bookActions(book({ finishedAt: 9 }))).toEqual(['unread', 'edit', 'remove']);
  });

  it('leaves out Mark as unread for a book not started', () => {
    const fresh = book({ position: imagePlace(imageIndex(0)), lastReadAt: null });

    expect(bookActions(fresh)).toEqual(['finish', 'edit', 'remove']);
  });
});

describe('BookDetailsView', () => {
  const one = book();
  const two = book({ id: bookId('two'), title: 'Two' });

  it('shows nothing until a book is opened', () => {
    expect(new BookDetailsView().opened([one, two])).toBeNull();
  });

  it('opens the details of the chosen book', () => {
    const view = new BookDetailsView();
    view.open(two.id);

    expect(view.opened([one, two])?.book).toBe(two);
    expect(view.opened([one, two])?.details.title).toBe('Two');
  });

  it('closes on request', () => {
    const view = new BookDetailsView();
    view.open(one.id);
    view.close();

    expect(view.opened([one, two])).toBeNull();
    expect(view.openId).toBeNull();
  });

  it('returns focus to the card that opened the details once they close', () => {
    const calls: (FocusOptions | undefined)[] = [];
    const target = {
      isConnected: true,
      focus: (options?: FocusOptions) => void calls.push(options),
    };
    const view = new BookDetailsView();
    view.open(one.id, { target, pointer: true });
    view.close();
    view.close();

    expect(calls).toEqual([{ focusVisible: false }]);
  });

  it('shows nothing once the opened book is removed from the shelf', () => {
    const view = new BookDetailsView();
    view.open(one.id);

    expect(view.opened([two])).toBeNull();
  });
});
