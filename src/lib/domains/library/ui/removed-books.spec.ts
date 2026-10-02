import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { LOADING, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { RemovedShelfEntry } from '../domain/book/removed-book';
import { removedEntries } from './library-shelf';
import {
  NO_RESTORE_HINT,
  RESTORE_HINT,
  captureCountText,
  removedEntryDescription,
  removedEntryName,
} from './removed-books';

const RECORDED: RemovedShelfEntry = {
  kind: 'recorded',
  book: {
    id: bookId('gone-1'),
    title: 'よつばと! 1',
    contentHash: '0123456789abcdef0123456789abcdef',
    fileName: 'yotsuba-1.epub',
    language: 'ja',
    direction: 'rtl',
  },
  captureCount: 3,
};

const UNKNOWN: RemovedShelfEntry = { kind: 'unknown', id: bookId('lost-1'), captureCount: 1 };

describe('removedEntryName', () => {
  it('names a removed book by its title and a book with no record as unknown', () => {
    expect(removedEntryName(RECORDED)).toBe('よつばと! 1');
    expect(removedEntryName(UNKNOWN)).toBe('Unknown book');
  });
});

describe('removedEntryDescription', () => {
  it('counts the captures and says how to restore a removed book', () => {
    expect(removedEntryDescription(RECORDED)).toBe(`3 captures · ${RESTORE_HINT}`);
    expect(RESTORE_HINT).toBe('Upload the same file again to restore it with its captures');
  });

  it('says the captures of a book with no record cannot be restored', () => {
    expect(removedEntryDescription(UNKNOWN)).toBe(`1 capture · ${NO_RESTORE_HINT}`);
  });
});

describe('captureCountText', () => {
  it('counts one capture apart from several', () => {
    expect(captureCountText(0)).toBe('0 captures');
    expect(captureCountText(1)).toBe('1 capture');
    expect(captureCountText(1200)).toBe('1,200 captures');
  });
});

describe('removedEntries', () => {
  it('lists the entries of a read answer, and none while loading or blocked', () => {
    expect(removedEntries(readReady({ kind: 'success', entries: [RECORDED] }))).toEqual([RECORDED]);
    expect(removedEntries(LOADING)).toEqual([]);
    expect(removedEntries(readReady(STORAGE_UNAVAILABLE))).toEqual([]);
  });
});
