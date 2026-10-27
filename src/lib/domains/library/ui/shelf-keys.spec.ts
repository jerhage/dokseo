import { describe, expect, it } from 'vitest';
import { bookId, imageIndex } from '$lib/shared/ids';
import { readFailed, readReady } from '$lib/shared/read-state';
import { imagePlace } from '$lib/shared/reading-place';
import { bookKey } from '$lib/shared/testing/book-key';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { Book } from '../domain/book/book';
import { LIBRARY_UNAVAILABLE } from '../queries/library-error-text';
import { shelfKeysOf } from './shelf-keys';

const ONE: Book = {
  id: bookId('one'),
  title: 'One',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'single',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: bookKey('one'),
  fileName: 'one.cbz',
  imageCount: 3,
  addedAt: 1,
  position: imagePlace(imageIndex(0)),
  lastReadAt: null,
  finishedAt: null,
};

describe('shelfKeysOf', () => {
  it('waits while the shelf is loading', () => {
    expect(shelfKeysOf({ kind: 'loading' })).toEqual({ kind: 'loading' });
  });

  it('lists the id and key of each shelf book', () => {
    const listed = shelfKeysOf(readReady({ kind: 'success', books: [ONE], unreadable: [] }));

    expect(listed).toEqual({
      kind: 'listed',
      entries: [{ id: bookId('one'), contentHash: bookKey('one') }],
      unreadable: [],
    });
  });

  it('lists the id and stored hash of each unreadable row', () => {
    const row = {
      id: bookId('broken'),
      title: null,
      alias: null,
      contentHash: 'abc',
      fileName: 'broken.cbz',
      stored: {},
    };
    const listed = shelfKeysOf(readReady({ kind: 'success', books: [], unreadable: [row] }));

    expect(listed).toEqual({
      kind: 'listed',
      entries: [],
      unreadable: [{ id: bookId('broken'), contentHash: 'abc' }],
    });
  });

  it('passes a failed read on with its message', () => {
    expect(shelfKeysOf(readFailed('gone'))).toEqual({ kind: 'failed', message: 'gone' });
  });

  it('names unavailable storage as a failure with the library text', () => {
    expect(shelfKeysOf(readReady(STORAGE_UNAVAILABLE))).toEqual({
      kind: 'failed',
      message: LIBRARY_UNAVAILABLE,
    });
  });
});
