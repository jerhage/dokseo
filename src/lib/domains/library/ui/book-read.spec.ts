import { describe, expect, it } from 'vitest';
import { bookId, contentHash } from '$lib/shared/ids';
import { START_OF_THE_TEXT } from '$lib/shared/reading-place';
import type { Book } from '../domain/book/book';
import { bookReadOf, flowingBook } from './book-read';
import type { BookRead } from './book-read';

function book(layoutKind: Book['layoutKind']): Book {
  return {
    id: bookId('one'),
    title: 'Kokoro',
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

describe('bookReadOf', () => {
  it('passes a read in progress as loading', () => {
    expect(bookReadOf({ kind: 'loading' })).toEqual({ kind: 'loading' });
  });

  it('passes a read that could not complete as failed with its message', () => {
    expect(bookReadOf({ kind: 'failed', message: 'Local storage failed: denied' })).toEqual({
      kind: 'failed',
      message: 'Local storage failed: denied',
    });
  });

  it('lifts a missing answer beside loading and failed', () => {
    expect(bookReadOf({ kind: 'ready', value: { kind: 'missing' } })).toEqual({
      kind: 'missing',
    });
  });

  it('hands the found book as ready', () => {
    const found = book('paged');

    expect(bookReadOf({ kind: 'ready', value: { kind: 'found', book: found } })).toEqual({
      kind: 'ready',
      book: found,
    });
  });
});

describe('flowingBook', () => {
  it('answers a ready book whose text flows', () => {
    const ebook = book('flow');

    expect(flowingBook({ kind: 'ready', book: ebook })).toBe(ebook);
  });

  it('answers nothing for a ready book of images, paged or continuous', () => {
    expect(flowingBook({ kind: 'ready', book: book('paged') })).toBeNull();
    expect(flowingBook({ kind: 'ready', book: book('continuous') })).toBeNull();
  });

  it('answers nothing while the book is loading, failed or missing', () => {
    const reads: readonly BookRead[] = [
      { kind: 'loading' },
      { kind: 'failed', message: 'denied' },
      { kind: 'missing' },
    ];

    expect(reads.map(flowingBook)).toEqual([null, null, null]);
  });
});
