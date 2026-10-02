import { describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { LOADING, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { RemovedBook } from '../domain/book/removed-book';
import { removedEntries } from './library-shelf';
import {
  DEFAULT_REMOVAL,
  DELETE_CAPTURES_CHOICE,
  DELETED_CAPTURES_FATE,
  REMOVAL_DELETES_CAPTURES,
  RESTORE_HINT,
  REMOVAL_KEEPS_CAPTURES,
  removalChosen,
  removalNote,
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
  addedAt: null,
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

describe('DEFAULT_REMOVAL', () => {
  it('keeps the captures unless the reader ticks the choice to delete them', () => {
    expect(DEFAULT_REMOVAL).toBe('keep-captures');
    expect(removalChosen(false)).toBe('keep-captures');
    expect(removalChosen(true)).toBe('delete-captures');
  });
});

describe('removalNote', () => {
  it('says the captures are kept, or that they go for good once the reader chose to delete them', () => {
    expect(DELETE_CAPTURES_CHOICE).toBe('Also delete its captures');
    expect(removalNote('keep-captures')).toBe(REMOVAL_KEEPS_CAPTURES);
    expect(removalNote('delete-captures')).toBe(REMOVAL_DELETES_CAPTURES);
    expect(REMOVAL_DELETES_CAPTURES).toBe(
      'Its captures will be deleted for good; uploading the file again will not bring them back.',
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
