import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { LOADING, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { unreadableRemovedBooksFrom } from '../domain/book/removed-book';
import type { RemovedBook, RemovedShelf, StoredRemovedBook } from '../domain/book/removed-book';
import { removedEntries, unreadableRemovedEntries } from './library-shelf';
import {
  DEFAULT_REMOVAL,
  DELETE_CAPTURES_CHOICE,
  DELETED_CAPTURES_FATE,
  REMOVAL_DELETES_CAPTURES,
  RESTORE_HINT,
  REMOVAL_KEEPS_CAPTURES,
  UNREADABLE_REMOVED_HINT,
  removalChosen,
  removalNote,
  removedBookName,
  removedEntryFor,
  unreadableRemovedBookName,
} from './removed-books';

const REMOVED: RemovedBook = {
  id: bookId('gone-1'),
  title: 'よつばと! 1',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'auto',
  pageFit: 'height',
  sourceKind: 'epub',
  contentHash: contentHash('0123456789abcdef0123456789abcdef'),
  fileName: 'yotsuba-1.epub',
  imageCount: 12,
  addedAt: 1,
  position: imagePlace(imageIndex(0)),
  lastReadAt: null,
  finishedAt: null,
  removedAt: 2,
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

function unreadableRecord(row: StoredRemovedBook) {
  const [record] = unreadableRemovedBooksFrom([row]);
  if (record === undefined) throw new Error('no record');
  return record;
}

const OLD = unreadableRecord({
  id: 'old-1',
  title: 'よつばと! 2',
  language: 'ja',
  contentHash: 'a'.repeat(64),
  removedAt: 3,
});

const LISTED: RemovedShelf = { kind: 'success', books: [REMOVED], unreadable: [OLD] };

describe('removedEntries', () => {
  it('lists the removed books of a read answer, and none while loading or blocked', () => {
    const read = readReady(LISTED);

    expect(removedEntries(read)).toEqual([REMOVED]);
    expect(removedEntries(LOADING)).toEqual([]);
    expect(removedEntries(readReady(STORAGE_UNAVAILABLE))).toEqual([]);
  });
});

describe('unreadableRemovedEntries', () => {
  it('lists the unreadable removed records of a read answer, and none while loading or blocked', () => {
    const read = readReady(LISTED);

    expect(unreadableRemovedEntries(read)).toEqual([OLD]);
    expect(unreadableRemovedEntries(LOADING)).toEqual([]);
    expect(unreadableRemovedEntries(readReady(STORAGE_UNAVAILABLE))).toEqual([]);
  });
});

describe('unreadableRemovedBookName', () => {
  it('names an unreadable removed record by its alias, then its title, then its file name', () => {
    const named = { id: 'old-1', removedAt: 3 };

    expect(
      unreadableRemovedBookName(unreadableRecord({ ...named, alias: 'Mine', title: 'T' })),
    ).toBe('Mine');
    expect(
      unreadableRemovedBookName(unreadableRecord({ ...named, title: ' T ', fileName: 'f.cbz' })),
    ).toBe('T');
    expect(
      unreadableRemovedBookName(unreadableRecord({ ...named, title: 7, fileName: 'f.cbz' })),
    ).toBe('f.cbz');
    expect(unreadableRemovedBookName(unreadableRecord(named))).toBe('Untitled book');
  });
});

describe('UNREADABLE_REMOVED_HINT', () => {
  it('says the record could not be read and how to restore it', () => {
    expect(UNREADABLE_REMOVED_HINT).toBe(
      'Could not be read. Upload the same file again to restore it with its captures',
    );
  });
});

describe('removedEntryFor', () => {
  it('finds a removed book or an unreadable removed record by id, with its name and language', () => {
    expect(removedEntryFor(REMOVED.id, [REMOVED], [OLD])).toEqual({
      id: 'gone-1',
      name: 'よつばと! 1',
      language: 'ja',
    });
    expect(removedEntryFor(OLD.id, [REMOVED], [OLD])).toEqual({
      id: 'old-1',
      name: 'よつばと! 2',
      language: 'ja',
    });
    expect(removedEntryFor(bookId('nowhere'), [REMOVED], [OLD])).toBeNull();
  });

  it('gives no language for an unreadable removed record whose language does not read', () => {
    const record = unreadableRecord({ id: 'old-2', title: 'Old', language: 'xx' });

    expect(removedEntryFor(record.id, [], [record])).toEqual({
      id: 'old-2',
      name: 'Old',
      language: null,
    });
  });
});
