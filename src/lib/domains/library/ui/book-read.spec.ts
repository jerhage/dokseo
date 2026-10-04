import { describe, expect, it } from 'vitest';
import { bookId, contentHash } from '$lib/shared/ids';
import { START_OF_THE_TEXT } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import { LIBRARY_UNAVAILABLE, UNREADABLE_BOOK } from '../queries/library-error-text';
import { bookReadOf, flowingBook, readingTitle } from './book-read';
import type { BookRead } from './book-read';

function book(layoutKind: Book['layoutKind']): Book {
  return {
    id: bookId('one'),
    title: 'Kokoro',
    alias: null,
    seriesId: null,
    volume: null,
    language: 'ja',
    layoutKind,
    direction: 'rtl',
    pagePairing: 'single',
    pageFit: 'height',
    sourceKind: layoutKind === 'flow' ? 'epub' : 'archive',
    contentHash: contentHash('a1'),
    fileName: 'book.epub',
    imageCount: 0,
    addedAt: 1,
    position: START_OF_THE_TEXT,
    lastReadAt: null,
    finishedAt: null,
  };
}

const found = book('paged');

describe('bookReadOf', () => {
  it.each([
    { read: 'a read in progress', state: { kind: 'loading' }, answer: { kind: 'loading' } },
    {
      read: 'a read that could not complete',
      state: { kind: 'failed', message: 'Local storage failed: denied' },
      answer: { kind: 'failed', message: 'Local storage failed: denied' },
    },
    {
      read: 'a not-found answer',
      state: { kind: 'ready', value: { kind: 'not-found', id: bookId('gone') } },
      answer: { kind: 'missing' },
    },
    {
      read: 'a found book',
      state: { kind: 'ready', value: { kind: 'success', book: found } },
      answer: { kind: 'ready', book: found },
    },
  ] as const)('lifts $read into its own state', ({ state, answer }) => {
    expect(bookReadOf(state)).toEqual(answer);
  });

  it('names a stored row it cannot read as a failed read that points to the repair', () => {
    expect(
      bookReadOf({ kind: 'ready', value: { kind: 'unreadable-book', id: bookId('broken') } }),
    ).toEqual({ kind: 'failed', message: UNREADABLE_BOOK });
  });

  it('names a blocked store as a failed read', () => {
    expect(bookReadOf({ kind: 'ready', value: { kind: 'storage-unavailable' } })).toEqual({
      kind: 'failed',
      message: LIBRARY_UNAVAILABLE,
    });
  });
});

describe('flowingBook', () => {
  it('answers a ready book whose text flows', () => {
    const ebook = book('flow');

    expect(flowingBook({ kind: 'ready', book: ebook })).toBe(ebook);
  });

  it('answers nothing while the book is loading, failed, missing, or made of images', () => {
    const reads: readonly BookRead[] = [
      { kind: 'loading' },
      { kind: 'failed', message: 'denied' },
      { kind: 'missing' },
      { kind: 'ready', book: book('paged') },
      { kind: 'ready', book: book('continuous') },
    ];

    expect(reads.map(flowingBook)).toEqual([null, null, null, null, null]);
  });
});

describe('readingTitle', () => {
  it('names a ready book by its title', () => {
    expect(readingTitle({ kind: 'ready', book: book('flow') })).toBe('Kokoro');
  });

  it('names a ready book by the alias its reader gave it', () => {
    expect(readingTitle({ kind: 'ready', book: { ...book('paged'), alias: 'Heart' } })).toBe(
      'Heart',
    );
  });

  it('names the reader while the book is loading, failed or missing', () => {
    const reads: readonly BookRead[] = [
      { kind: 'loading' },
      { kind: 'failed', message: 'denied' },
      { kind: 'missing' },
    ];

    expect(reads.map(readingTitle)).toEqual(['Reader', 'Reader', 'Reader']);
  });
});
