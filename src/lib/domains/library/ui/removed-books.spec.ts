import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { LOADING, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { RemovedBook } from '../domain/book/removed-book';
import { removedEntries } from './library-shelf';
import {
  DELETED_CAPTURES_FATE,
  RESTORE_HINT,
  REMOVAL_KEEPS_CAPTURES,
  removedBookName,
} from './removed-books';

const REMOVED: RemovedBook = {
  id: bookId('gone-1'),
  title: 'よつばと! 1',
  alias: null,
  contentHash: '0123456789abcdef0123456789abcdef',
  fileName: 'yotsuba-1.epub',
  language: 'ja',
  direction: 'rtl',
};

describe('removedBookName', () => {
  it('names a removed book by its title', () => {
    expect(removedBookName(REMOVED)).toBe('よつばと! 1');
  });

  it('names a renamed removed book by its alias, then its original title', () => {
    expect(removedBookName({ ...REMOVED, alias: 'Mine' })).toBe('Mine (originally よつばと! 1)');
  });
});

describe('RESTORE_HINT', () => {
  it('says how to restore a removed book', () => {
    expect(RESTORE_HINT).toBe('Upload the same file again to restore it with its captures');
  });
});

describe('REMOVAL_KEEPS_CAPTURES', () => {
  it('tells the reader the captures stay and the same file restores the book', () => {
    expect(REMOVAL_KEEPS_CAPTURES).toBe(
      'Its captures are kept. Upload the same file again to restore it with its captures.',
    );
  });
});

describe('DELETED_CAPTURES_FATE', () => {
  it('says the deleted captures are gone for good, with no count', () => {
    expect(DELETED_CAPTURES_FATE).toBe(
      'will be deleted for good, and uploading the file again will not bring them back.',
    );
  });
});

describe('removedEntries', () => {
  it('lists the removed books of a read answer, and none while loading or blocked', () => {
    expect(removedEntries(readReady({ kind: 'success', books: [REMOVED] }))).toEqual([REMOVED]);
    expect(removedEntries(LOADING)).toEqual([]);
    expect(removedEntries(readReady(STORAGE_UNAVAILABLE))).toEqual([]);
  });
});
