import { describe, expect, it } from 'vitest';
import { GOLDEN_TEXT, STORE_ROWS, goldenCounts, goldenPart } from './stored-layout';

describe('the stored layout on the page', () => {
  it('lists every store of the pinned layouts and the flowing store', () => {
    expect(STORE_ROWS.map((row) => `${row.database} v${row.version} ${row.store}`)).toEqual([
      'reader v4 books',
      'reader v4 page-lists',
      'reader v4 removed-books',
      'reader v4 outbox',
      'reader v4 record-versions',
      'recognition v6 model-consent',
      'recognition v6 captures',
      'recognition v6 recognizer-setup',
      'recognition v6 tags',
      'recognition v6 outbox',
      'recognition v6 record-versions',
      'flowing v1 reading-settings',
      'catalog-origins v2 catalogs',
      'catalog-origins v2 origins',
      'catalog-origins v2 outbox',
      'catalog-origins v2 record-versions',
      'sync v3 settings',
      'sync v3 held-changes',
      'sync v3 tried-downloads',
    ]);
  });

  it('marks the sync settings store, which holds the device token, as outside the compatibility promise', () => {
    expect(STORE_ROWS.find((row) => row.store === 'settings')?.coverage).toBe('outside');
  });

  it('marks the sync held-changes and tried-downloads stores as outside the compatibility promise', () => {
    expect(STORE_ROWS.find((row) => row.store === 'held-changes')?.coverage).toBe('outside');
    expect(STORE_ROWS.find((row) => row.store === 'tried-downloads')?.coverage).toBe('outside');
  });

  it('names a compound index by both of its key paths and marks it unique', () => {
    const origins = STORE_ROWS.find((row) => row.store === 'origins');

    expect(origins?.keyPath).toBe('bookId');
    expect(origins?.indexes).toEqual([
      'catalogId on catalogId',
      'entry on catalogId + entryId, unique',
    ]);
  });

  it('names each key path and index from the layout literal', () => {
    const captures = STORE_ROWS.find((row) => row.store === 'captures');

    expect(captures?.keyPath).toBe('id');
    expect(captures?.indexes).toEqual(['bookId on bookId', 'tagIds on tagIds, multiEntry']);
    expect(STORE_ROWS.find((row) => row.store === 'model-consent')?.coverage).toBe('store only');
  });

  it('reads the golden file with the real reader into every entry it holds', () => {
    expect(goldenCounts(GOLDEN_TEXT)).toEqual([
      { section: 'books', inFile: 4, read: 4 },
      { section: 'tags', inFile: 2, read: 2 },
      { section: 'captures', inFile: 4, read: 4 },
      { section: 'unreadable', inFile: 3, read: 0 },
    ]);
  });

  it('counts nothing for a file the reader refuses', () => {
    expect(goldenCounts('{"format":"dokseo-captures","version":2}')).toEqual([]);
  });

  it('quotes the first book entry and the unreadable section from the golden file', () => {
    expect(JSON.parse(goldenPart('books'))).toMatchObject({ key: 'book-1', title: 'ARIA 3' });
    expect(Object.keys(JSON.parse(goldenPart('unreadable')))).toEqual([
      'books',
      'tags',
      'captures',
    ]);
  });
});
