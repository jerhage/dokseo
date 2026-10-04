import { describe, expect, it } from 'vitest';
import { GOLDEN_TEXT, STORE_ROWS, goldenCounts, goldenPart } from './stored-layout';

describe('the stored layout on the page', () => {
  it('lists every store of the pinned layouts and the flowing store', () => {
    expect(STORE_ROWS.map((row) => `${row.database} v${row.version} ${row.store}`)).toEqual([
      'reader v3 books',
      'reader v3 page-lists',
      'reader v3 removed-books',
      'recognition v5 model-consent',
      'recognition v5 captures',
      'recognition v5 recognizer-setup',
      'recognition v5 tags',
      'flowing v1 reading-settings',
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
