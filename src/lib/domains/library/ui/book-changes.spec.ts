import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import { FINISH_FAILED, UNREAD_FAILED, markFailedTitle, undoOffer } from './book-changes.svelte';

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: bookId('one'),
    title: 'Blame! 1',
    alias: null,
    language: 'ja',
    layoutKind: 'paged',
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.cbz',
    imageCount: 182,
    addedAt: 1,
    position: imagePlace(imageIndex(40)),
    lastReadAt: null,
    finishedAt: null,
    ...overrides,
  };
}

describe('undoOffer', () => {
  it('offers Undo when a finished book leaves the shelf', () => {
    expect(undoOffer('finished', book(), book({ finishedAt: 5 }), 'reading')).toBe(
      'Marked Blame! 1 finished',
    );
  });

  it('offers Undo when an unread book leaves the finished shelf', () => {
    const finished = book({ finishedAt: 5 });
    const unread = book({ position: imagePlace(imageIndex(0)) });

    expect(undoOffer('unread', finished, unread, 'finished')).toBe('Marked Blame! 1 unread');
  });

  it('names a renamed book by its alias in the Undo offer', () => {
    const marked = book({ finishedAt: 5, alias: 'Mine' });

    expect(undoOffer('finished', book(), marked, 'reading')).toBe('Marked Mine finished');
  });

  it('offers nothing for a mark that keeps the book on the shelf', () => {
    expect(undoOffer('finished', book(), book({ finishedAt: 5 }), 'all')).toBeNull();
  });

  it('offers nothing for a book that was not on the shelf before the mark', () => {
    expect(undoOffer('finished', book(), book({ finishedAt: 5 }), 'unread')).toBeNull();
    expect(undoOffer('finished', undefined, book({ finishedAt: 5 }), 'reading')).toBeNull();
  });
});

describe('markFailedTitle', () => {
  it('titles a failed mark by the mark it made', () => {
    expect(markFailedTitle('finished')).toBe(FINISH_FAILED);
    expect(markFailedTitle('unread')).toBe(UNREAD_FAILED);
  });
});
