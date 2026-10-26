import { describe, expect, it } from 'vitest';
import type { Book } from '$lib/domains/library/domain/book/book';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { fromSyncBookData, toSyncBookData } from './book-data';
import { contractExamples, schemaKeys } from './contract-examples';

const ORIGIN_NOT_READ = new Set(['origin-without-acquisition.json']);

const BOOK: Book = {
  id: bookId('device-local-id'),
  title: 'Yotsuba&!',
  alias: 'Neko',
  seriesId: null,
  volume: 1,
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'auto',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: contentHash('0123456789abcdef0123456789abcdef'),
  fileName: 'Yotsuba v01.cbz',
  imageCount: 192,
  addedAt: 1772445000000,
  position: imagePlace(imageIndex(3)),
  lastReadAt: 1772445500000,
  finishedAt: null,
};

describe('book record data', () => {
  it('reads every valid contract example as a book', () => {
    for (const { name, value } of contractExamples('valid', 'book')) {
      expect(fromSyncBookData(value).kind, name).toBe('success');
    }
  });

  it('reports every invalid contract example as unreadable', () => {
    for (const { name, value } of contractExamples('invalid', 'book')) {
      if (ORIGIN_NOT_READ.has(name)) continue;
      expect(fromSyncBookData(value).kind, name).toBe('unreadable');
    }
  });

  it('leaves the device-local fields out of the data', () => {
    const { properties } = schemaKeys('book');
    const keys = Object.keys(toSyncBookData(BOOK));
    expect(keys.filter((key) => !properties.includes(key))).toEqual([]);
    expect(keys).not.toContain('id');
    expect(keys).not.toContain('position');
  });

  it('reads a book back unchanged', () => {
    const read = fromSyncBookData(toSyncBookData(BOOK));
    if (read.kind !== 'success') throw new Error(read.reason);
    expect(read.book).toEqual({
      contentHash: BOOK.contentHash,
      fileName: BOOK.fileName,
      title: BOOK.title,
      alias: BOOK.alias,
      seriesId: BOOK.seriesId,
      volume: BOOK.volume,
      language: BOOK.language,
      direction: BOOK.direction,
      layoutKind: BOOK.layoutKind,
      sourceKind: BOOK.sourceKind,
      imageCount: BOOK.imageCount,
    });
  });
});
